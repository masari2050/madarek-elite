import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── عميل أدمن ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── محاولة التحقق من المستخدم (اختياري) ──
    let user: any = null
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const supabaseUser = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        )
        const { data } = await supabaseUser.auth.getUser()
        user = data?.user || null
      }
    } catch (_) { /* الجلسة منتهية — نكمل بدونها */ }

    // ── قراءة paymentId ──
    const { paymentId } = await req.json()
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'رقم الدفع مطلوب' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── التحقق من ماي فاتورة ──
    const MF_API_KEY = Deno.env.get('MYFATOORAH_API_KEY')
    const MF_BASE_URL = Deno.env.get('MYFATOORAH_BASE_URL') || 'https://apitest.myfatoorah.com'

    if (!MF_API_KEY) {
      return new Response(JSON.stringify({ error: 'مفتاح ماي فاتورة غير مُعدّ' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── الدفع ناجح — تفعيل الاشتراك ──

    // استخراج الخطة و userId من CustomerReference (الصيغة: userId|plan)
    const ref = invoiceData.CustomerReference || ''
    const parts = ref.split('|')
    const refUserId = parts[0] || ''
    const plan = parts[1] || 'monthly'

    // تحديد المستخدم: من الجلسة أو من CustomerReference
    const targetUserId = user?.id || refUserId

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'لم نتمكن من تحديد المستخدم' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // لو المستخدم مسجّل دخول، تأكد إنه نفس صاحب الفاتورة
    if (user && refUserId && refUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'هذه الفاتورة ليست لحسابك' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // حساب تاريخ انتهاء الاشتراك
    const durMonths = plan === 'yearly' ? 12 : 1
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + durMonths)

    // تحديث ملف المستخدم
    await supabaseAdmin.from('profiles').update({
      subscription_type: plan,
      subscription_end: endDate.toISOString()
    }).eq('id', targetUserId)

    // تحديث سجل الدفع
    await supabaseAdmin.from('payments').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      provider_data: invoiceData
    }).eq('payment_id', String(invoiceData.InvoiceId))

    // ── إرجاع النتيجة ──
    return new Response(JSON.stringify({
      status: 'paid',
      plan: plan,
      amount: invoiceData.InvoiceValue,
      expires: endDate.toISOString().split('T')[0]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Verify Payment Error:', e)
    return new Response(JSON.stringify({ error: 'خطأ في التحقق: ' + (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
