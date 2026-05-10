// ═══════════════════════════════════════════════════════════════
// Edge Function: autorenew-charge
// ───────────────────────────────────────────────────────────────
// يُستدعى من cron يومياً (02:00 UTC).
// لكل مستخدم اشتراكه ينتهي خلال -1..+1 يوم:
//   1. يقرأ سعر الخطة من plans
//   2. يُنشئ فاتورة MyFatoorah جديدة (SendPayment)
//   3. يُسجّل المحاولة في autorenew_attempts
//   4. يُنشئ payments row بـ status='pending_renewal'
//   5. (TODO: يُرسل إشعار Push للمستخدم — بعد إتمام task #5)
//
// السلوك عند الفشل:
//   • فشل MyFatoorah → يُسجّل error_message + يزيد attempt_number
//   • 3 محاولات فاشلة → cron آخر (expire_failed_autorenews) يحوّل لـ free
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type QueueUser = {
  user_id: string
  email: string
  phone: string | null
  full_name: string | null
  subscription_end: string
  plan_type: 'monthly' | 'quarterly' | 'yearly'
  next_attempt: number
}

type ResultSummary = {
  processed: number
  succeeded: number
  failed: number
  skipped: number
  details: Array<{ user_id: string; attempt: number; status: string; message?: string }>
}

serve(async (req) => {
  // ── الـ cron يستدعيها عبر pg_net (POST مع Authorization) ──
  // أمان: يجب أن تأتي مع Bearer SERVICE_ROLE_KEY (يضعها pg_net تلقائياً)
  //       أو CRON_SECRET اختياري (إن أُعدّ في Function Secrets)
  // لا نحتاج CORS — endpoint داخلي للـ cron فقط
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 })
  }

  // ── تحقّق من المصدر ──
  const auth = req.headers.get('Authorization') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

  const expectedTokens = [
    serviceRoleKey ? `Bearer ${serviceRoleKey}` : null,
    cronSecret ? `Bearer ${cronSecret}` : null,
  ].filter(Boolean) as string[]

  if (expectedTokens.length === 0 || !expectedTokens.includes(auth)) {
    console.warn('[autorenew-charge] unauthorized call attempt')
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const summary: ResultSummary = {
    processed: 0, succeeded: 0, failed: 0, skipped: 0, details: [],
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    )

    // ── 1) جلب الطابور ──
    const { data: queue, error: queueErr } = await supabaseAdmin.rpc('get_autorenew_queue')
    if (queueErr) {
      console.error('[autorenew-charge] get_autorenew_queue failed:', queueErr)
      return new Response(JSON.stringify({ error: queueErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const users = (queue ?? []) as QueueUser[]
    console.log(`[autorenew-charge] queue size: ${users.length}`)

    if (users.length === 0) {
      return new Response(JSON.stringify({ ...summary, note: 'queue فارغ' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── 2) MyFatoorah config ──
    const MF_API_KEY = Deno.env.get('MYFATOORAH_API_KEY')
    const MF_BASE_URL = Deno.env.get('MYFATOORAH_BASE_URL') || 'https://apitest.myfatoorah.com'
    if (!MF_API_KEY) {
      console.error('[autorenew-charge] MYFATOORAH_API_KEY missing')
      return new Response(JSON.stringify({ error: 'MF config missing' }), { status: 500 })
    }

    // ── 3) معالجة كل مستخدم ──
    for (const u of users) {
      summary.processed++

      // (أ) قراءة السعر الحالي من plans
      const { data: planRow } = await supabaseAdmin
        .from('plans')
        .select('price, duration_days')
        .eq('slug', u.plan_type)
        .maybeSingle()

      const amount = Number(planRow?.price ?? 0)
      if (amount <= 0) {
        summary.skipped++
        summary.details.push({
          user_id: u.user_id,
          attempt: u.next_attempt,
          status: 'skipped',
          message: 'سعر الخطة غير محدّد',
        })
        await supabaseAdmin.rpc('log_autorenew_attempt', {
          p_user_id: u.user_id,
          p_attempt_number: u.next_attempt,
          p_plan_type: u.plan_type,
          p_amount: 0,
          p_mf_invoice_id: null,
          p_mf_invoice_url: null,
          p_error: 'plan price = 0',
        })
        continue
      }

      // (ب) إنشاء فاتورة MyFatoorah
      let invoiceId: string | null = null
      let invoiceUrl: string | null = null
      let mfError: string | null = null

      try {
        const mfRes = await fetch(MF_BASE_URL + '/v2/SendPayment', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + MF_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            NotificationOption: 'LNK',
            InvoiceValue: amount,
            CustomerName: u.full_name || u.email?.split('@')[0] || 'مشترك',
            CustomerEmail: u.email,
            CustomerMobile: u.phone ?? undefined,
            DisplayCurrencyIso: 'SAR',
            // عند الدفع: نفس payment-return-v2.html يتعامل مع التجديد
            CallBackUrl: 'https://www.madarekelite.com/v2/payment-return-v2.html?src=app&renewal=1',
            ErrorUrl: 'https://www.madarekelite.com/v2/payment-return-v2.html?src=app&renewal=1&error=true',
            Language: 'AR',
            CustomerReference: u.user_id + '|renewal|' + u.plan_type,
            InvoiceItems: [{
              ItemName: (u.plan_type === 'yearly' ? 'تجديد اشتراك سنوي'
                : u.plan_type === 'quarterly' ? 'تجديد اشتراك ربع سنوي'
                : 'تجديد اشتراك شهري') + ' — مدارك النخبة',
              Quantity: 1,
              UnitPrice: amount,
            }],
          }),
        })
        const mfJson = await mfRes.json()
        if (!mfJson.IsSuccess) {
          mfError = mfJson.Message ?? 'MyFatoorah رفض الطلب'
        } else {
          invoiceId = String(mfJson.Data?.InvoiceId ?? '')
          invoiceUrl = mfJson.Data?.InvoiceURL ?? null
        }
      } catch (e: any) {
        mfError = 'MF network error: ' + (e?.message ?? 'unknown')
      }

      // (ج) تسجيل المحاولة
      await supabaseAdmin.rpc('log_autorenew_attempt', {
        p_user_id: u.user_id,
        p_attempt_number: u.next_attempt,
        p_plan_type: u.plan_type,
        p_amount: amount,
        p_mf_invoice_id: invoiceId,
        p_mf_invoice_url: invoiceUrl,
        p_error: mfError,
      })

      if (mfError) {
        summary.failed++
        summary.details.push({
          user_id: u.user_id,
          attempt: u.next_attempt,
          status: 'failed',
          message: mfError,
        })
        continue
      }

      // (د) إدخال payment row بـ status='pending_renewal'
      await supabaseAdmin.from('payments').insert({
        user_id: u.user_id,
        amount: amount,
        status: 'pending_renewal',
        plan_type: u.plan_type,
        payment_id: invoiceId,
      })

      // (هـ) TODO: إرسال Push notification للمستخدم مع invoiceUrl
      // سيُوصل لاحقاً عند إنجاز task #5 (Push Notifications)

      summary.succeeded++
      summary.details.push({
        user_id: u.user_id,
        attempt: u.next_attempt,
        status: 'created',
        message: `invoice=${invoiceId}`,
      })

      console.log(`[autorenew-charge] ✅ user=${u.user_id}, attempt=${u.next_attempt}, invoice=${invoiceId}`)
    }

    // ── تسجيل النتيجة الإجمالية في cron_logs ──
    await supabaseAdmin.from('cron_logs').insert({
      job_name: 'autorenew-charge-run',
      result: summary as any,
      notes: `processed=${summary.processed}, ok=${summary.succeeded}, fail=${summary.failed}, skip=${summary.skipped}`,
    })

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (e) {
    console.error('[autorenew-charge] Uncaught:', e)
    return new Response(JSON.stringify({
      error: (e as Error).message,
      summary,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
