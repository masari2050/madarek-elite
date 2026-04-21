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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // ── عميل أدمن ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── التحقق من المستخدم (إجباري) ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'سجّل دخول أولاً' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
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
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ── قراءة paymentId ──
    const { paymentId } = await req.json()
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'رقم الدفع مطلوب' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ── التحقق من ماي فاتورة ──
    const MF_API_KEY = Deno.env.get('MYFATOORAH_API_KEY')
    const MF_BASE_URL = Deno.env.get('MYFATOORAH_BASE_URL') || 'https://apitest.myfatoorah.com'

    if (!MF_API_KEY) {
      return new Response(JSON.stringify({ error: 'مفتاح ماي فاتورة غير مُعدّ' }), {
        status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // جرّب PaymentId أولاً، ثم InvoiceId
    let mfData: any = null

    for (const keyType of ['PaymentId', 'InvoiceId']) {
      const mfRes = await fetch(MF_BASE_URL + '/v2/GetPaymentStatus', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + MF_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Key: String(paymentId), KeyType: keyType })
      })

      const result = await mfRes.json()
      if (result.IsSuccess) {
        mfData = result
        break
      }
    }

    if (!mfData || !mfData.IsSuccess) {
      return new Response(JSON.stringify({ error: 'فشل التحقق من حالة الدفع' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const invoiceData = mfData.Data
    const isPaid = invoiceData.InvoiceStatus === 'Paid'

    if (!isPaid) {
      // تحديث حالة الدفع في قاعدة البيانات
      await supabaseAdmin.from('payments')
        .update({ status: 'failed' })
        .eq('payment_id', String(invoiceData.InvoiceId))

      return new Response(JSON.stringify({
        status: 'unpaid',
        error: 'الدفع لم يكتمل — حالة الفاتورة: ' + invoiceData.InvoiceStatus
      }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ── الدفع ناجح — تفعيل الاشتراك ──

    // استخراج الخطة و userId من CustomerReference (الصيغة: userId|plan)
    const ref = invoiceData.CustomerReference || ''
    const parts = ref.split('|')
    const refUserId = parts[0] || ''
    const plan = parts[1] || 'monthly'

    // تحديد المستخدم: من الجلسة (إجباري الآن)
    const targetUserId = user.id

    // تأكد إن الفاتورة تخص نفس المستخدم
    if (refUserId && refUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'هذه الفاتورة ليست لحسابك' }), {
        status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // حساب تاريخ انتهاء الاشتراك
    const durMonths = plan === 'yearly' ? 12 : 1
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + durMonths)

    // تحديث ملف المستخدم عبر SECURITY DEFINER RPC (يتجاوز RLS)
    const { error: rpcErr } = await supabaseAdmin.rpc('activate_subscription_by_coupon', {
      p_user_id: targetUserId,
      p_subscription_type: plan,
      p_duration_months: durMonths
    })
    if (rpcErr) {
      console.error('[verify-payment] RPC error:', rpcErr.message)
      // Fallback: direct update
      await supabaseAdmin.from('profiles').update({
        subscription_type: plan,
        subscription_end: endDate.toISOString()
      }).eq('id', targetUserId)
    }

    // ── استخراج وسيلة الدفع من MyFatoorah (visa/mada/apple_pay/stc_pay) ──
    // نقرأ من InvoiceTransactions[0].PaymentGateway (أكثر صدقاً من الحقول الأخرى)
    let paymentMethod: string | null = null
    try {
      const tx = Array.isArray(invoiceData.InvoiceTransactions)
        ? invoiceData.InvoiceTransactions[0]
        : null
      const gw = String(tx?.PaymentGateway || invoiceData.PaymentGateway || '').toLowerCase()
      if (gw.includes('mada') || gw === 'md') paymentMethod = 'mada'
      else if (gw.includes('visa') || gw.includes('master')) paymentMethod = 'visa'
      else if (gw.includes('apple')) paymentMethod = 'apple_pay'
      else if (gw.includes('stc')) paymentMethod = 'stc_pay'
    } catch (_) { /* اختياري — لو فشل نتركه NULL */ }

    // تحديث سجل الدفع
    const updatePayload: Record<string, any> = {
      status: 'paid',
      paid_at: new Date().toISOString(),
      provider_data: invoiceData
    }
    if (paymentMethod) updatePayload.payment_method = paymentMethod

    const { data: paymentRow } = await supabaseAdmin.from('payments')
      .update(updatePayload)
      .eq('payment_id', String(invoiceData.InvoiceId))
      .select('id')
      .maybeSingle()

    // ── تسجيل دفعة الإحالة (لو فيه إحالة معلّقة) ──
    // الـRPC يرجع {success:false} بأمان لو ما في إحالة — لا نفشل الدالة كلها.
    if (paymentRow?.id) {
      try {
        const { data: markResult, error: markErr } = await supabaseAdmin.rpc('mark_referral_paid', {
          p_referred_user_id: targetUserId,
          p_payment_id: paymentRow.id,
        })
        if (markErr) {
          console.warn('[verify-payment] mark_referral_paid warn:', markErr.message)
        } else if (markResult?.success) {
          console.log('[verify-payment] referral marked paid:', markResult.referral_id)
        }
      } catch (e) {
        console.warn('[verify-payment] mark_referral_paid exception:', (e as Error).message)
      }
    }

    // ── TikTok Events API — تتبع إتمام الدفع ──
    const ttUser = {
      email: user.email || '',
      phone: '',
      external_id: targetUserId,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || '',
      user_agent: req.headers.get('user-agent') || '',
      ttp: '',
      ttclid: '',
    }
    // جلب الجوال من profiles
    try {
      const { data: prof } = await supabaseAdmin.from('profiles').select('phone').eq('id', targetUserId).single()
      if (prof?.phone) ttUser.phone = prof.phone
    } catch (_) {}
    // ttp و ttclid يجون من الكلاينت
    try {
      const bodyClone = await req.clone().json()
      if (bodyClone.ttp) ttUser.ttp = bodyClone.ttp
      if (bodyClone.ttclid) ttUser.ttclid = bodyClone.ttclid
    } catch (_) {}

    // CompletePayment فقط — Subscribe ترسل من create-payment (funnel order)
    await sendTikTokEvent('CompletePayment', ttUser, {
      value: invoiceData.InvoiceValue,
      currency: 'SAR',
      content_id: plan,
      description: plan === 'yearly' ? 'اشتراك سنوي' : 'اشتراك شهري',
    })

    // ── إرجاع النتيجة ──
    return new Response(JSON.stringify({
      status: 'paid',
      plan: plan,
      amount: invoiceData.InvoiceValue,
      expires: endDate.toISOString().split('T')[0]
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Verify Payment Error:', e)
    return new Response(JSON.stringify({ error: 'خطأ في التحقق: ' + (e as Error).message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
