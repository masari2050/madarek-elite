import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Admin client ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── Auth check ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'سجّل دخول أولاً' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'سجّل دخول أولاً' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Request body ──
    const { plan, coupon } = await req.json()
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'خطة غير صحيحة' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[create-payment] user=${user.id}, plan=${plan}, coupon=${coupon || 'none'}`)

    // ── Fetch prices ──
    const { data: settings } = await supabaseAdmin.from('site_settings')
      .select('key, value')
      .in('key', ['price_monthly_original', 'price_yearly_original', 'discount_percent'])

    const settingsMap: Record<string, number> = {}
    settings?.forEach((s: any) => settingsMap[s.key] = parseFloat(s.value))

    const disc = settingsMap['discount_percent'] || 0
    let basePrice = plan === 'yearly'
      ? Math.round((settingsMap['price_yearly_original'] || 468) * (100 - disc) / 100)
      : Math.round((settingsMap['price_monthly_original'] || 60) * (100 - disc) / 100)

    let finalAmount = basePrice
    let couponData: any = null
    let durMonths = plan === 'yearly' ? 12 : 1

    // ── Coupon validation ──
    if (coupon) {
      const { data: cp, error: cpErr } = await supabaseAdmin.from('coupons')
        .select('*').eq('code', coupon.toUpperCase()).single()

      if (cpErr || !cp) {
        return new Response(JSON.stringify({ error: 'كوبون غير صحيح' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validate expiry
      if (cp.expires_at && new Date(cp.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'كوبون منتهي الصلاحية' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validate usage
      if (cp.max_uses && (cp.used_count || 0) >= cp.max_uses) {
        return new Response(JSON.stringify({ error: 'كوبون مستنفد' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validate plan type
      if (cp.plan_type !== 'all' && cp.plan_type !== plan) {
        const pn = cp.plan_type === 'monthly' ? 'الشهرية' : 'السنوية'
        return new Response(JSON.stringify({ error: `هذا الكوبون للباقة ${pn} فقط` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      couponData = cp
      if (cp.duration_months) durMonths = cp.duration_months

      // Calculate discount
      if (cp.discount_type === 'free' || (cp.discount_type === 'percentage' && cp.discount_value >= 100)) {
        finalAmount = 0
      } else if (cp.discount_type === 'percentage') {
        finalAmount = Math.max(0, basePrice - Math.round(basePrice * cp.discount_value / 100))
      } else if (cp.discount_type === 'fixed') {
        finalAmount = Math.max(0, basePrice - Math.min(cp.discount_value, basePrice))
      }

      console.log(`[create-payment] coupon=${coupon}, discount_type=${cp.discount_type}, base=${basePrice}, final=${finalAmount}`)
    }

    // ── FREE (amount = 0) → activate directly ──
    if (finalAmount <= 0) {
      const subType = durMonths >= 12 ? 'yearly' : (durMonths >= 1 ? 'monthly' : 'monthly')
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + durMonths)

      // Insert payment record as paid
      await supabaseAdmin.from('payments').insert({
        user_id: user.id,
        amount: 0,
        status: 'paid',
        plan_type: subType,
        coupon_code: coupon?.toUpperCase() || null,
        payment_id: 'FREE-' + Date.now(),
        paid_at: new Date().toISOString(),
      })

      // Activate subscription directly (Trigger will also fire as backup)
      await supabaseAdmin.from('profiles').update({
        subscription_type: subType,
        subscription_end: endDate.toISOString(),
      }).eq('id', user.id)

      // Increment coupon usage
      if (couponData) {
        try { await supabaseAdmin.rpc('increment_coupon_usage', { p_code: coupon.toUpperCase() }) } catch(_) {}
      }

      console.log(`[create-payment] ✅ FREE activation: user=${user.id}, plan=${subType}, expires=${endDate.toISOString()}`)

      return new Response(JSON.stringify({
        free: true,
        plan: subType,
        expires: endDate.toISOString().split('T')[0],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── PAID → create MyFatoorah invoice ──
    const MF_API_KEY = Deno.env.get('MYFATOORAH_API_KEY')
    const MF_BASE_URL = Deno.env.get('MYFATOORAH_BASE_URL') || 'https://apitest.myfatoorah.com'

    if (!MF_API_KEY) {
      return new Response(JSON.stringify({ error: 'بوابة الدفع غير مُعدّة' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create payment record
    const paymentId = 'PAY-' + Date.now()
    await supabaseAdmin.from('payments').insert({
      user_id: user.id,
      amount: finalAmount,
      status: 'pending',
      plan_type: plan,
      coupon_code: coupon?.toUpperCase() || null,
      payment_id: paymentId,
    })

    // Create MyFatoorah invoice
    const mfRes = await fetch(MF_BASE_URL + '/v2/SendPayment', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MF_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        InvoiceValue: finalAmount,
        CustomerName: user.email?.split('@')[0] || 'مشترك',
        CustomerEmail: user.email,
        DisplayCurrencyIso: 'SAR',
        CallBackUrl: 'https://www.madarekelite.com/payment-callback.html',
        ErrorUrl: 'https://www.madarekelite.com/payment-callback.html?error=true',
        Language: 'AR',
        CustomerReference: user.id + '|' + plan,
        InvoiceItems: [{
          ItemName: plan === 'yearly' ? 'اشتراك سنوي — مدارك النخبة' : 'اشتراك شهري — مدارك النخبة',
          Quantity: 1,
          UnitPrice: finalAmount,
        }],
      }),
    })

    const mfData = await mfRes.json()

    if (!mfData.IsSuccess) {
      console.error('[create-payment] MyFatoorah error:', JSON.stringify(mfData))
      return new Response(JSON.stringify({ error: 'خطأ في بوابة الدفع' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update payment with MyFatoorah invoice ID
    const invoiceId = mfData.Data?.InvoiceId
    if (invoiceId) {
      await supabaseAdmin.from('payments').update({ payment_id: String(invoiceId) })
        .eq('payment_id', paymentId)
    }

    console.log(`[create-payment] ✅ Invoice created: ${invoiceId}, amount=${finalAmount}`)

    return new Response(JSON.stringify({
      paymentUrl: mfData.Data?.InvoiceURL,
      invoiceId: invoiceId,
      amount: finalAmount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('[create-payment] Error:', e)
    return new Response(JSON.stringify({ error: 'خطأ في إنشاء الدفع: ' + (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
