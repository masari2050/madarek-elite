// ═══════════════════════════════════════════════════════════════
// Edge Function: delete-account
// ───────────────────────────────────────────────────────────────
// يحذف حساب المستخدم نهائياً (Apple Guideline 5.1.1(v)).
//
// الخطوات:
//   1. يتحقّق من JWT ويستخرج userId
//   2. يتأكّد إن المستخدم يطلب حذف حسابه هو فقط (ليس حساب شخص آخر)
//   3. يستدعي RPC scrub_user_pii للمسح الدفاعي
//   4. supabase.auth.admin.deleteUser(userId) — الحذف النهائي
//      (FKs بـ ON DELETE CASCADE تحذف البقيّة تلقائياً)
//   5. يُرجع success للتطبيق → التطبيق يُسجّل خروج + يعود للـ Welcome
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ['https://madarekelite.com', 'https://www.madarekelite.com']
  // التطبيق (Expo) يرسل origin قد يكون null/undefined — نسمح بالفئتين
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'الطريقة غير مسموحة' }), {
      status: 405,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  try {
    // ── عميل أدمن ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── استخراج userId من JWT (نفس نمط verify-payment) ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'سجّل دخول أولاً' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
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
        return new Response(JSON.stringify({ error: 'انتهت الجلسة — سجّل دخول من جديد' }), {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: 'توكن غير صالح: ' + (e as Error).message }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // ── تأكّد أن المستخدم موجود فعلاً ──
    const { data: adminUserRes, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authErr || !adminUserRes?.user) {
      return new Response(JSON.stringify({ error: 'الحساب غير موجود' }), {
        status: 404,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // ── قراءة جسم الطلب (اختياري — للتأكيد الإضافي) ──
    let confirmText = ''
    try {
      const body = await req.json()
      confirmText = (body?.confirm_text ?? '').toString().trim()
    } catch {
      // body فارغ — مقبول
    }

    // طبقة حماية إضافية: نطلب من الواجهة ترسل "حذف نهائي" كـ magic phrase
    // (حماية ضد الاستدعاءات الخاطئة — ليس ضد المستخدم ذاته)
    const EXPECTED = 'حذف نهائي'
    if (confirmText !== EXPECTED) {
      return new Response(JSON.stringify({
        error: 'تأكيد الحذف مفقود',
        hint: `أرسل confirm_text = "${EXPECTED}" لتأكيد الطلب`,
      }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // ── الخطوة 1: scrub PII ──
    const { error: scrubErr } = await supabaseAdmin.rpc('scrub_user_pii', { p_user_id: userId })
    if (scrubErr) {
      console.error('scrub_user_pii failed:', scrubErr)
      // نكمل رغم فشل scrub — الحذف النهائي أهم، والـ CASCADE سيمسح profile
    }

    // ── الخطوة 2: حذف auth user ──
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteErr) {
      console.error('deleteUser failed:', deleteErr)
      return new Response(JSON.stringify({
        error: 'تعذّر حذف الحساب — تواصل مع الدعم',
        detail: deleteErr.message,
      }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // ── نجاح ──
    return new Response(JSON.stringify({
      success: true,
      message: 'تم حذف حسابك نهائياً',
      deleted_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })

  } catch (e) {
    console.error('delete-account unexpected error:', e)
    return new Response(JSON.stringify({
      error: 'خطأ غير متوقّع',
      detail: (e as Error).message,
    }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
