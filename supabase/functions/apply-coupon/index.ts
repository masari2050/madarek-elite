import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonRes(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── 1. Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ error: 'يرجى تسجيل الدخول أولاً' }, 401)

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
    if (authErr || !user) return jsonRes({ error: 'يرجى تسجيل الدخول أولاً' }, 401)

    // ── 2. Read request ──
    const { code, plan } = await req.json()
    if (!code) return jsonRes({ error: 'أدخل كود الكوبون' }, 400)

    const couponCode = code.trim().toUpperCase()
    console.log(`[apply-coupon] user=${user.id}, code=${couponCode}, plan=${plan || 'auto'}`)

    // ── 3. Fetch coupon ──
    const { data: coupon, error: cpErr } = await supabaseAdmin
      .from('coupons').select('*').eq('code', couponCode).single()

    if (cpErr || !coupon) {
      console.log(`[apply-coupon] FAIL: coupon not found`)
      return jsonRes({ error: 'الكود غير صحيح' }, 400)
    }

    // ── 4. Validate expiry ──
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      console.log(`[apply-coupon] FAIL: expired`)
      return jsonRes({ error: 'انتهت صلاحية هذا الكود' }, 400)
    }

    // ── 5. Validate max uses ──
    if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) {
      console.log(`[apply-coupon] FAIL: max uses reached`)
      return jsonRes({ error: 'تم استنفاد هذا الكود' }, 400)
    }

    // ── 6. Check if user already used this coupon ──
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_code', couponCode)
      .eq('status', 'paid')
      .limit(1)
      .maybeSingle()

    if (existingPayment) {
      console.log(`[apply-coupon] FAIL: already used by this user`)
      return jsonRes({ error: 'استخدمت هذا الكود مسبقاً' }, 400)
    }

    // ── 7. Validate plan type ──
    if (coupon.plan_type !== 'all' && plan && coupon.plan_type !== plan) {
      const pn = coupon.plan_type === 'monthly' ? 'الشهرية' : 'السنوية'
      return jsonRes({ error: `هذا الكوبون للباقة ${pn} فقط` }, 400)
    }

    // ── 8. Calculate discount ──
    const { data: settings } = await supabaseAdmin
      .from('site_settings').select('key, value')
      .in('key', ['price_monthly_original', 'price_yearly_original', 'discount_percent'])

    const sm: Record<string, number> = {}
    settings?.forEach((s: any) => sm[s.key] = parseFloat(s.value))

    const disc = sm['discount_percent'] || 0
    const durMonths = coupon.duration_months || (coupon.plan_type === 'yearly' ? 12 : 1)
    
    // Determine subscription type from duration
    const subType = durMonths >= 12 ? 'yearly' : 'monthly'
    const basePriceKey = subType === 'yearly' ? 'price_yearly_original' : 'price_monthly_original'
    let basePrice = Math.round((sm[basePriceKey] || (subType === 'yearly' ? 468 : 60)) * (100 - disc) / 100)

    let finalAmount = basePrice
    const isFree = coupon.discount_type === 'free' || 
                   (coupon.discount_type === 'percentage' && coupon.discount_value >= 100)

    if (isFree) {
      finalAmount = 0
    } else if (coupon.discount_type === 'percentage') {
      finalAmount = Math.max(0, basePrice - Math.round(basePrice * coupon.discount_value / 100))
    } else if (coupon.discount_type === 'fixed') {
      finalAmount = Math.max(0, basePrice - Math.min(coupon.discount_value, basePrice))
    }

    console.log(`[apply-coupon] subType=${subType}, durMonths=${durMonths}, base=${basePrice}, final=${finalAmount}, isFree=${isFree}`)

    // ── 9. If FREE → activate directly ──
    if (finalAmount <= 0) {
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + durMonths)

      // Insert payment record
      const { error: payErr } = await supabaseAdmin.from('payments').insert({
        user_id: user.id,
        amount: 0,
        status: 'paid',
        plan_type: subType,
        coupon_code: couponCode,
        payment_id: 'FREE-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        paid_at: new Date().toISOString(),
      })
      if (payErr) console.error('[apply-coupon] payment insert error:', payErr.message)

      // Update profile directly
      const { error: profErr } = await supabaseAdmin.from('profiles').update({
        subscription_type: subType,
        subscription_end: endDate.toISOString(),
      }).eq('id', user.id)
      
      if (profErr) {
        console.error('[apply-coupon] profile update error:', profErr.message)
        return jsonRes({ error: 'خطأ في تفعيل الاشتراك — تواصل مع الدعم' }, 500)
      }

      // Increment coupon usage
      const { error: incErr } = await supabaseAdmin
        .from('coupons')
        .update({ used_count: (coupon.used_count || 0) + 1 })
        .eq('code', couponCode)
      if (incErr) console.error('[apply-coupon] increment error:', incErr.message)

      // Verify the update actually happened
      const { data: verify } = await supabaseAdmin
        .from('profiles')
        .select('subscription_type, subscription_end')
        .eq('id', user.id)
        .single()

      console.log(`[apply-coupon] ✅ FREE activation done. Verify: type=${verify?.subscription_type}, end=${verify?.subscription_end}`)

      // Check that subscription is NOT free (it could be monthly or yearly - both are valid)
      if (!verify || verify.subscription_type === 'free' || !verify.subscription_type) {
        console.error('[apply-coupon] ❌ PROFILE UPDATE FAILED SILENTLY!')
        return jsonRes({ error: 'فشل تفعيل الاشتراك — تواصل مع الدعم عبر الواتساب' }, 500)
      }

      return jsonRes({
        success: true,
        free: true,
        plan: subType,
        subscription_type: subType,
        subscription_end: endDate.toISOString(),
        expires: endDate.toISOString().split('T')[0],
        message: `تم تفعيل اشتراكك ال${subType === 'yearly' ? 'سنوي' : 'شهري'} مجاناً!`
      })
    }

    // ── 10. DISCOUNTED → return discount info for payment ──
    return jsonRes({
      success: true,
      free: false,
      discount: true,
      plan: subType,
      originalPrice: basePrice,
      finalPrice: finalAmount,
      discountAmount: basePrice - finalAmount,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      couponCode: couponCode,
      durMonths: durMonths,
      message: `خصم ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ' ريال'} — السعر النهائي: ${finalAmount} ريال`
    })

  } catch (e) {
    console.error('[apply-coupon] Error:', e)
    return jsonRes({ error: 'خطأ في النظام — حاول مرة ثانية' }, 500)
  }
})
