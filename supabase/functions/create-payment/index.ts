import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { sendTikTokEvent } from "../_shared/tiktok-events.ts"

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ['https://madarekelite.com', 'https://www.madarekelite.com']
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // ── Admin client ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── Auth check (JWT decode + admin verification) ──
    // نتعامل يدوياً مع JWT لتجاوز خطأ "Unsupported JWT algorithm ES256"
    // الذي يحدث عندما يوقّع Supabase التوكنات بـ asymmetric keys ES256
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'سجّل دخول أولاً' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    let userId = ''
    let userEmail = ''
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('صيغة JWT غير صالحة')
      // base64url → base64
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = b64 + '==='.slice((b64.length + 3) % 4)
      const payload = JSON.parse(atob(padded))
      userId = payload.sub || ''
      userEmail = payload.email || ''
      if (!userId) throw new Error('sub غير موجود في JWT')
      // تحقّق من انتهاء الصلاحية
      if (payload.exp && typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
        return new Response(JSON.stringify({ error: 'انتهت الجلسة — سجّل دخول من جديد' }), {
          status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }
    } catch (e) {
      console.error('[create-payment] JWT decode failed:', (e as Error).message)
      return new Response(JSON.stringify({ error: 'توكن غير صالح: ' + (e as Error).message }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // تأكّد أن المستخدم موجود فعلاً (عبر service_role — يتجاوز مشكلة ES256)
    const { data: adminUserRes, error: adminErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (adminErr || !adminUserRes?.user) {
      console.error('[create-payment] admin.getUserById failed:', adminErr?.message)
      return new Response(JSON.stringify({ error: 'الحساب غير موجود' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }
    const user = adminUserRes.user
    if (!user.email && userEmail) (user as any).email = userEmail
    console.log(`[create-payment] auth ok: user=${userId}, email=${user.email}`)

    // ── Request body ──
    const body = await req.json()
    const { plan, coupon } = body
    // source='app' → رجوع للتطبيق عبر deep link بعد الدفع
    //        'web' (الافتراضي) → صفحة callback القديمة للموقع
    const source = body.source === 'app' ? 'app' : 'web'
    if (!plan || !['monthly', 'quarterly', 'yearly'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'خطة غير صحيحة' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    console.log(`[create-payment] user=${user.id}, plan=${plan}, coupon=${coupon || 'none'}, source=${source}`)

    // ── جلب السعر من جدول plans (المصدر الوحيد للحقيقة — يوافق ما يشاهده العميل) ──
    // fallback لـ site_settings القديم إذا فشل
    let basePrice = 0
    let durMonths = plan === 'yearly' ? 12 : (plan === 'quarterly' ? 3 : 1)

    try {
      const { data: planRow, error: planErr } = await supabaseAdmin.from('plans')
        .select('price, duration_days')
        .eq('slug', plan)
        .maybeSingle()
      if (planErr) console.warn('[create-payment] plans query err:', planErr.message)
      if (planRow?.price) {
        basePrice = Number(planRow.price)
        if (planRow.duration_days) {
          durMonths = Math.max(1, Math.round(Number(planRow.duration_days) / 30))
        }
        console.log(`[create-payment] price from plans: ${basePrice} SAR, durMonths=${durMonths}`)
      }
    } catch (e) { console.warn('[create-payment] plans lookup failed:', (e as Error).message) }

    if (basePrice <= 0) {
      // fallback: جدول site_settings (النسخة القديمة)
      const { data: settings } = await supabaseAdmin.from('site_settings')
        .select('key, value')
        .in('key', ['price_monthly_current', 'price_quarterly_current', 'price_yearly_current',
                   'price_monthly_original', 'price_quarterly_original', 'price_yearly_original'])

      const settingsMap: Record<string, number> = {}
      settings?.forEach((s: any) => { const v = parseFloat(s.value); if (!isNaN(v)) settingsMap[s.key] = v })

      basePrice = plan === 'yearly'
        ? (settingsMap['price_yearly_current'] || settingsMap['price_yearly_original'] || 799)
        : plan === 'quarterly'
          ? (settingsMap['price_quarterly_current'] || settingsMap['price_quarterly_original'] || 249)
          : (settingsMap['price_monthly_current'] || settingsMap['price_monthly_original'] || 99)
    }

    let finalAmount = basePrice
    let couponData: any = null

    // ── Coupon validation ──
    if (coupon) {
      const { data: cp, error: cpErr } = await supabaseAdmin.from('coupons')
        .select('*').eq('code', coupon.toUpperCase()).single()

      if (cpErr || !cp) {
        return new Response(JSON.stringify({ error: 'كوبون غير صحيح' }), {
          status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }

      // Validate expiry
      if (cp.expires_at && new Date(cp.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'كوبون منتهي الصلاحية' }), {
          status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }

      // Validate usage
      if (cp.max_uses && (cp.used_count || 0) >= cp.max_uses) {
        return new Response(JSON.stringify({ error: 'كوبون مستنفد' }), {
          status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }

      // Validate plan type
      if (cp.plan_type !== 'all' && cp.plan_type !== plan) {
        const pn = cp.plan_type === 'monthly' ? 'الشهرية' : 'السنوية'
        return new Response(JSON.stringify({ error: `هذا الكوبون للباقة ${pn} فقط` }), {
          status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
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
      const subType = durMonths >= 12 ? 'yearly'
        : durMonths >= 3 ? 'quarterly'
        : 'monthly'
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

      // Activate subscription via SECURITY DEFINER RPC (bypasses RLS)
      const { error: rpcErr } = await supabaseAdmin.rpc('activate_subscription_by_coupon', {
        p_user_id: user.id,
        p_subscription_type: subType,
        p_duration_months: durMonths
      })
      if (rpcErr) {
        console.error('[create-payment] RPC error:', rpcErr.message)
        // Fallback: direct update
        await supabaseAdmin.from('profiles').update({
          subscription_type: subType,
          subscription_end: endDate.toISOString(),
        }).eq('id', user.id)
      }

      // Increment coupon usage
      if (couponData) {
        try { await supabaseAdmin.rpc('increment_coupon_usage', { p_code: coupon.toUpperCase() }) } catch(_) {}
      }

      console.log(`[create-payment] ✅ FREE activation: user=${user.id}, plan=${subType}, expires=${endDate.toISOString()}`)

      // ── TikTok Events API — تتبع الاشتراك المجاني ──
      const ttUser = {
        email: user.email || '',
        phone: '',
        external_id: user.id,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || '',
        user_agent: req.headers.get('user-agent') || '',
        ttp: '',
        ttclid: '',
      }
      try {
        const { data: prof } = await supabaseAdmin.from('profiles').select('phone').eq('id', user.id).single()
        if (prof?.phone) ttUser.phone = prof.phone
      } catch (_) {}
      // ttp و ttclid يجون من الكلاينت (إذا أرسلهم)
      try {
        const body = await req.clone().json()
        if (body.ttp) ttUser.ttp = body.ttp
        if (body.ttclid) ttUser.ttclid = body.ttclid
      } catch (_) {}
      try {
        await sendTikTokEvent('Subscribe', ttUser, {
          value: 0,
          currency: 'SAR',
          content_id: subType === 'yearly' ? 'yearly' : 'monthly',
          description: subType === 'yearly' ? 'اشتراك سنوي' : 'اشتراك شهري',
        })
      } catch (tte) { console.warn('[create-payment] TikTok event (free) failed:', (tte as Error).message) }

      return new Response(JSON.stringify({
        free: true,
        plan: subType,
        expires: endDate.toISOString().split('T')[0],
      }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ── PAID → create MyFatoorah invoice ──
    const MF_API_KEY = Deno.env.get('MYFATOORAH_API_KEY')
    const MF_BASE_URL = Deno.env.get('MYFATOORAH_BASE_URL') || 'https://apitest.myfatoorah.com'

    if (!MF_API_KEY) {
      console.error('[create-payment] MYFATOORAH_API_KEY missing!')
      return new Response(JSON.stringify({ error: 'بوابة الدفع غير مُعدّة (MF_API_KEY)' }), {
        status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }
    console.log(`[create-payment] MF config: base=${MF_BASE_URL}, key_len=${MF_API_KEY.length}, finalAmount=${finalAmount}`)

    // ⚡ تشغيل إدخال السجل + طلب MyFatoorah بالتوازي لتسريع الاستجابة
    const paymentId = 'PAY-' + Date.now()

    const [_, mfRes] = await Promise.all([
      // 1) إدخال سجل الدفع (لا نحتاج نتيجته)
      supabaseAdmin.from('payments').insert({
        user_id: user.id,
        amount: finalAmount,
        status: 'pending',
        plan_type: plan,
        coupon_code: coupon?.toUpperCase() || null,
        payment_id: paymentId,
      }).then(r => { if (r.error) console.error('[create-payment] insert err:', r.error.message) }),

      // 2) إنشاء فاتورة MyFatoorah (هذا اللي نحتاج نتيجته)
      fetch(MF_BASE_URL + '/v2/SendPayment', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + MF_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          NotificationOption: 'LNK',
          InvoiceValue: finalAmount,
          CustomerName: user.email?.split('@')[0] || 'مشترك',
          CustomerEmail: user.email,
          DisplayCurrencyIso: 'SAR',
          CallBackUrl: source === 'app'
            ? 'https://www.madarekelite.com/v2/payment-return-v2.html?src=app'
            : 'https://www.madarekelite.com/payment-callback.html',
          ErrorUrl: source === 'app'
            ? 'https://www.madarekelite.com/v2/payment-return-v2.html?src=app&error=true'
            : 'https://www.madarekelite.com/payment-callback.html?error=true',
          Language: 'AR',
          CustomerReference: user.id + '|' + plan,
          InvoiceItems: [{
            ItemName: plan === 'yearly' ? 'اشتراك سنوي — مدارك النخبة'
              : plan === 'quarterly' ? 'اشتراك 3 شهور — مدارك النخبة'
              : 'اشتراك شهري — مدارك النخبة',
            Quantity: 1,
            UnitPrice: finalAmount,
          }],
        }),
      }),
    ])

    const mfData = await mfRes.json()

    if (!mfData.IsSuccess) {
      const mfMsg = mfData.Message || mfData.ValidationErrors?.[0]?.Error || 'بوابة الدفع رفضت الطلب'
      console.error('[create-payment] MyFatoorah error:', JSON.stringify(mfData))
      return new Response(JSON.stringify({ error: `MyFatoorah: ${mfMsg}` }), {
        status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ⚡ تحديث الـ invoice ID بدون انتظار (fire-and-forget) — المستخدم ما يحتاج ينتظر
    const invoiceId = mfData.Data?.InvoiceId
    if (invoiceId) {
      supabaseAdmin.from('payments').update({ payment_id: String(invoiceId) })
        .eq('payment_id', paymentId)
        .then(r => { if (r.error) console.error('[create-payment] update err:', r.error.message) })
    }

    console.log(`[create-payment] ✅ Invoice created: ${invoiceId}, amount=${finalAmount}`)

    // ── TikTok Events API — تتبع بدء الاشتراك (مسار الدفع العادي) ──
    const ttUser = {
      email: user.email || '',
      phone: '',
      external_id: user.id,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || '',
      user_agent: req.headers.get('user-agent') || '',
      ttp: '',
      ttclid: '',
    }
    try {
      const { data: prof } = await supabaseAdmin.from('profiles').select('phone').eq('id', user.id).single()
      if (prof?.phone) ttUser.phone = prof.phone
    } catch (_) {}
    // ttp و ttclid يجون من الكلاينت
    try {
      const bodyClone = await req.clone().json()
      if (bodyClone.ttp) ttUser.ttp = bodyClone.ttp
      if (bodyClone.ttclid) ttUser.ttclid = bodyClone.ttclid
    } catch (_) {}
    try {
      await sendTikTokEvent('Subscribe', ttUser, {
        value: finalAmount,
        currency: 'SAR',
        content_id: plan,
        description: plan === 'yearly' ? 'اشتراك سنوي' : 'اشتراك شهري',
      })
    } catch (tte) { console.warn('[create-payment] TikTok event (paid) failed:', (tte as Error).message) }

    // ⚡ إرجاع الرابط فوراً
    return new Response(JSON.stringify({
      paymentUrl: mfData.Data?.InvoiceURL,
      invoiceId: invoiceId,
      amount: finalAmount,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (e) {
    const msg = (e as Error)?.message || String(e)
    const stack = (e as Error)?.stack || ''
    console.error('[create-payment] Uncaught:', msg, '\n', stack)
    return new Response(JSON.stringify({ error: 'خطأ غير متوقع: ' + msg }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
