// admin-update-user — Edge Function
// يسمح للـadmin بتعديل البريد الإلكتروني / كلمة السر لأي عضو.
// يتطلب: JWT للـadmin (role IN admin/staff في profiles) + service_role لتعديل auth.users.
//
// Body:
//   { user_id: UUID, new_email?: string, new_password?: string }
//
// Returns:
//   { success: true, updated: { email?: bool, password?: bool } }
// أو { error: '...' } لو فشل

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = origin === 'https://madarekelite.com'
    || origin === 'https://www.madarekelite.com'
    || /^https:\/\/madarek-elite(-[a-z0-9-]+)?-masaris-projects-4d33553a\.vercel\.app$/.test(origin)
    || /^https:\/\/madarek-elite-fresh(-[a-z0-9-]+)?-masaris-projects-4d33553a\.vercel\.app$/.test(origin)
    || /^http:\/\/localhost(:\d+)?$/.test(origin)
  const allowedOrigin = allowed ? origin : 'https://madarekelite.com'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (body: any, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' }
  })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── 1. Auth: فك JWT يدوياً (نفس نمط apply-coupon لتجاوز ES256) ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'يرجى تسجيل الدخول' }, 401)

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    let callerId = ''
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('JWT غير صالح')
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = b64 + '==='.slice((b64.length + 3) % 4)
      const payload = JSON.parse(atob(padded))
      callerId = payload.sub || ''
      if (!callerId) throw new Error('sub مفقود')
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return json({ error: 'انتهت الجلسة — سجّل دخول من جديد' }, 401)
      }
    } catch (e) {
      return json({ error: 'توكن غير صالح' }, 401)
    }

    // ── 2. تحقّق إنّ caller = admin أو staff ──
    const { data: callerProfile, error: cpErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', callerId)
      .single()

    if (cpErr || !callerProfile) return json({ error: 'الحساب غير موجود' }, 401)
    if (!['admin', 'staff'].includes(callerProfile.role)) {
      return json({ error: 'غير مسموح — للـadmin فقط' }, 403)
    }

    // ── 3. اقرأ الـbody ──
    const body = await req.json().catch(() => ({}))
    const { user_id, new_email, new_password } = body || {}

    if (!user_id || typeof user_id !== 'string') {
      return json({ error: 'user_id مطلوب' }, 400)
    }

    // staff لا يقدر يعدّل admin (حماية)
    if (callerProfile.role === 'staff') {
      const { data: target } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user_id).single()
      if (target?.role === 'admin') {
        return json({ error: 'staff لا يقدر يعدّل حساب admin' }, 403)
      }
    }

    // ── 4. تحقّق من المدخلات ──
    const updates: Record<string, string> = {}
    let willUpdateEmail = false
    let willUpdatePassword = false

    if (typeof new_email === 'string' && new_email.trim()) {
      const e = new_email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return json({ error: 'صيغة البريد غير صحيحة' }, 400)
      }
      updates.email = e
      willUpdateEmail = true
    }

    if (typeof new_password === 'string' && new_password.length > 0) {
      if (new_password.length < 6) {
        return json({ error: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' }, 400)
      }
      updates.password = new_password
      willUpdatePassword = true
    }

    if (!willUpdateEmail && !willUpdatePassword) {
      return json({ error: 'لم يتم إرسال أي تغيير' }, 400)
    }

    // ── 5. حدّث auth.users عبر admin API ──
    // email_confirm: true يتجاوز رسالة "أكّد بريدك"
    const adminUpdate: Record<string, any> = {}
    if (willUpdateEmail)    { adminUpdate.email = updates.email; adminUpdate.email_confirm = true }
    if (willUpdatePassword)   adminUpdate.password = updates.password

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, adminUpdate)
    if (authErr) {
      return json({ error: 'فشل تحديث الحساب: ' + authErr.message }, 400)
    }

    // ── 6. زامن profiles.email لو الإيميل تغيّر ──
    if (willUpdateEmail) {
      const { error: profErr } = await supabaseAdmin
        .from('profiles').update({ email: updates.email }).eq('id', user_id)
      if (profErr) console.error('[admin-update-user] profiles email sync failed:', profErr.message)
    }

    return json({
      success: true,
      updated: {
        email: willUpdateEmail,
        password: willUpdatePassword
      }
    })

  } catch (e) {
    console.error('[admin-update-user] unexpected:', e)
    return json({ error: 'خطأ في النظام — حاول مرة ثانية' }, 500)
  }
})
