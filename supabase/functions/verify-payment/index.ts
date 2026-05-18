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

    // ── التحقق من المستخدم (JWT decode + admin — يتجاوز ES256) ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'سجّل دخول أولاً' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    let userId = ''
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('صيغة JWT غير صالحة')
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = b64 + '==='.slice((b64.length + 3) % 4)
      const payload = JSON.parse(atob(padded))
      userId = payload.sub || ''
      if (!userId) throw new Error('sub غير موجود')
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return new Response(JSON.stringify({ error: 'انتهت الجلسة' }), {
          status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: 'توكن غير صالح: ' + (e as Error).message }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }
    const { data: adminUserRes, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authErr || !adminUserRes?.user) {
      return new Response(JSON.stringify({ error: 'الحساب غير موجود' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }
    const user = adminUserRes.user

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
    const refParts = ref.split('|')
    const refUserId = refParts[0] || ''
    const refPlan = refParts[1] || 'monthly'

    // تحديد المستخدم: من الجلسة (إجباري الآن)
    const targetUserId = user.id

    // تأكد إن الفاتورة تخص نفس المستخدم
    if (refUserId && refUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'هذه الفاتورة ليست لحسابك' }), {
        status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🛡️ AMOUNT + PLAN TAMPERING DEFENSE (C1 — fix-payment-amount-check-may11)
    // ───────────────────────────────────────────────────────────────────────
    // نقارن المبلغ المدفوع فعلياً (MyFatoorah) مع ما خزّناه server-side في
    // create-payment (في payments.amount). أي اختلاف >1 ر.س = محاولة تلاعب.
    //
    // نستخدم plan من payments.plan_type (الموثوق server-side) بدلاً من
    // refPlan (CustomerReference) — defense-in-depth حتى لو تم تعديل
    // CustomerReference نظرياً عبر webhook مزوّر أو خطأ في create-payment.
    //
    // الحماية تغطّي:
    //   - تعديل CustomerReference بعد إنشاء الفاتورة (نظرياً)
    //   - partial payment (لو MyFatoorah يدعمها يوماً)
    //   - currency confusion
    //   - أي bug مستقبلي في create-payment يكسر السعر/الخطة
    // ═══════════════════════════════════════════════════════════════════════
    const paidAmount = Number(invoiceData.InvoiceValue || 0)
    const paymentRecordId = String(invoiceData.InvoiceId)

    const { data: pmtRow, error: pmtErr } = await supabaseAdmin.from('payments')
      .select('amount, plan_type, coupon_code, user_id')
      .eq('payment_id', paymentRecordId)
      .maybeSingle()

    if (pmtErr || !pmtRow) {
      console.error('[verify-payment] payments lookup failed:', pmtErr?.message, 'invoiceId:', paymentRecordId)
      return new Response(JSON.stringify({
        error: 'سجل الدفع غير موجود. تواصل مع الدعم.'
      }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // 🛡️ تحقّق إضافي: payments.user_id يطابق المستخدم في الجلسة
    if (pmtRow.user_id && pmtRow.user_id !== user.id) {
      console.error(`[verify-payment] 🚨 USER MISMATCH: payments.user_id=${pmtRow.user_id}, session=${user.id}`)
      return new Response(JSON.stringify({ error: 'هذه الفاتورة ليست لحسابك' }), {
        status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const expectedAmount = Number(pmtRow.amount || 0)
    const AMOUNT_TOLERANCE_SAR = 1.0  // tolerance لـrounding errors

    if (expectedAmount > 0 && Math.abs(paidAmount - expectedAmount) > AMOUNT_TOLERANCE_SAR) {
      console.error(
        `[verify-payment] 🚨 AMOUNT TAMPERING DETECTED:\n` +
        `  paid=${paidAmount} SAR\n` +
        `  expected=${expectedAmount} SAR (from payments table — trusted server-side)\n` +
        `  refPlan=${refPlan} (from CustomerReference — untrusted)\n` +
        `  dbPlan=${pmtRow.plan_type} (from payments table — trusted)\n` +
        `  invoiceId=${paymentRecordId}\n` +
        `  user=${user.id} (${user.email})\n` +
        `  coupon=${pmtRow.coupon_code || 'none'}`
      )

      // علّم السجل كـtamper_suspect — admin يقدر يراجع لاحقاً
      await supabaseAdmin.from('payments').update({
        status: 'tamper_suspect',
        provider_data: {
          ...invoiceData,
          _tamper_detected: {
            paid_amount: paidAmount,
            expected_amount: expectedAmount,
            ref_plan: refPlan,
            db_plan: pmtRow.plan_type,
            detected_at: new Date().toISOString()
          }
        }
      }).eq('payment_id', paymentRecordId)

      return new Response(JSON.stringify({
        status: 'amount_mismatch',
        error: 'القيمة المدفوعة لا تطابق المعتمد. لا يمكن تفعيل الاشتراك تلقائياً — تواصل مع الدعم.'
      }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // 🛡️ استخدم plan من payments table (server-side trusted) بدلاً من CustomerReference
    // payments.plan_type تم حفظه في create-payment بعد التحقّق من JWT و body validation.
    const plan = pmtRow.plan_type || refPlan

    // لو في mismatch بين DB و CustomerReference، نسجّل warning (لكن نكمّل بـplan الموثوق)
    if (pmtRow.plan_type && pmtRow.plan_type !== refPlan) {
      console.warn(
        `[verify-payment] ⚠️ Plan mismatch (using DB value): ` +
        `db=${pmtRow.plan_type}, ref=${refPlan}, user=${user.id}`
      )
    }

    // ─── Period 1 product (one-time purchase, not a subscription) ───
    const isProduct = plan === 'period1'
    if (isProduct) {
      const PERIOD1_LEAK_GROUPS = [
        'cfaf82ac-dc99-43ac-8d00-d44133802245',  // Wed 13
        '002b90df-4849-4842-88cd-8c4c11253573',  // Thu 14 (yelo)
        'c48e7dd9-8dc6-47c4-9a30-4b53766fb361',  // Thu 14 (mohandesa)
        'a4b1c2d3-7654-4321-8aaa-fedc12345678',  // Fri 15
        'b6a2c3d4-7777-4321-8aaa-fed012345001',  // Sat 16 morning
        'f62fd04b-fcf1-e144-5931-039d178c582e',  // Sat 16 evening
        '7d5c8a6b-9e3f-4a2d-b1c4-58a0d3f7e982',  // Sun 17 morning (Day 5)
        '8e6d9c7a-af4d-4b3e-c2d5-69b1e4a8d093',  // Sun 17 evening (Day 5)
      ]
      const { error: prErr } = await supabaseAdmin.rpc('record_product_purchase', {
        p_user_id: targetUserId,
        p_slug: 'tahsili_period1_1447',
        p_payment_id: String(invoiceData.InvoiceId),
        p_amount: Number(pmtRow.amount) || 29,
        p_leak_group_ids: PERIOD1_LEAK_GROUPS,
      })
      if (prErr) {
        console.error('[verify-payment] product RPC error:', prErr.message)
      } else {
        console.log(`[verify-payment] ✅ product recorded for user ${targetUserId}: tahsili_period1_1447`)
      }
    } else {
      // ─── Subscription flow (monthly/quarterly/yearly) ───
      // حساب تاريخ انتهاء الاشتراك
      const durMonths = plan === 'yearly' ? 12 : (plan === 'quarterly' ? 3 : 1)
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + durMonths)

      // تحديث ملف المستخدم عبر SECURITY DEFINER RPC (يتجاوز RLS)
      // + ضمان حفظ subscription_end صريحاً في الـfallback لمنع تكرار NULL bug
      const { error: rpcErr } = await supabaseAdmin.rpc('activate_subscription_by_coupon', {
        p_user_id: targetUserId,
        p_subscription_type: plan,
        p_duration_months: durMonths
      })

      // Verification: مهما حصل، نتأكد إن subscription_end ليس NULL
      // (مشكلة 2026: 8 مستخدمين دفعوا فعلياً لكن subscription_end ظل NULL)
      const { data: verifyProfile } = await supabaseAdmin.from('profiles')
        .select('subscription_type, subscription_end, subscription_source')
        .eq('id', targetUserId).maybeSingle()

      if (rpcErr || !verifyProfile?.subscription_end) {
        if (rpcErr) console.error('[verify-payment] RPC error:', rpcErr.message)
        else console.warn('[verify-payment] RPC succeeded but subscription_end is NULL — applying defensive fallback')
        // Defensive direct update — يضمن دائماً subscription_end صالح
        await supabaseAdmin.from('profiles').update({
          subscription_type: plan,
          subscription_end: endDate.toISOString(),
          subscription_source: 'myfatoorah'
        }).eq('id', targetUserId)
      } else if (!verifyProfile.subscription_source) {
        // RPC نجح + end موجود لكن source مفقود → نضيفه فقط
        await supabaseAdmin.from('profiles').update({ subscription_source: 'myfatoorah' }).eq('id', targetUserId)
      }
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

    // ── TikTok Purchase event (الاسم الرسمي = Purchase، مش CompletePayment) ──
    // event_id = 'purchase_' + paymentId → نفس الصيغة في client (payment-callback.html
    // و payment-return-v2.html). الـclient يستخدم paymentId من URL (?paymentId=...)
    // والـserver يستلم نفس القيمة في body — يضمن deduplication بين server و client events.
    const purchaseEventId = 'purchase_' + String(paymentId)
    await sendTikTokEvent('Purchase', ttUser, {
      value: invoiceData.InvoiceValue,
      currency: 'SAR',
      content_id: 'madarek_' + plan,
      description: plan === 'yearly' ? 'مدارك النخبة - سنوي' : plan === 'quarterly' ? 'مدارك النخبة - 3 شهور' : 'مدارك النخبة - شهري',
      event_id: purchaseEventId,
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
