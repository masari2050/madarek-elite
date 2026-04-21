import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { sendTikTokEvent } from "../_shared/tiktok-events.ts"

/**
 * track-event Edge Function
 * يستقبل أحداث TikTok من الكلاينت ويرسلها server-side مع بيانات المستخدم
 *
 * الأحداث المدعومة:
 * - ViewContent: لما المستخدم يفتح صفحة التسعير
 *
 * مثال استدعاء من الكلاينت:
 * fetch('SUPABASE_URL/functions/v1/track-event', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer TOKEN' },
 *   body: JSON.stringify({
 *     event: 'ViewContent',
 *     content_id: 'pricing_page',
 *     value: 59,
 *     currency: 'SAR',
 *     ttp: document.cookie.match(/_ttp=([^;]+)/)?.[1] || '',
 *     ttclid: new URLSearchParams(location.search).get('ttclid') || '',
 *   })
 * })
 */

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ['https://madarekelite.com', 'https://www.madarekelite.com']
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// الأحداث المسموحة — لا نقبل أي event عشوائي
const ALLOWED_EVENTS = ['ViewContent', 'ClickButton', 'Search', 'AddToCart']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const body = await req.json()
    const { event, content_id, value, currency, ttp, ttclid } = body

    // التحقق من Event name
    if (!event || !ALLOWED_EVENTS.includes(event)) {
      return new Response(JSON.stringify({ error: 'event غير مدعوم' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ── بناء بيانات المستخدم ──
    const ttUser: any = {
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || '',
      user_agent: req.headers.get('user-agent') || '',
      ttp: ttp || '',
      ttclid: ttclid || '',
    }

    // محاولة جلب بيانات المستخدم إذا مسجل دخول
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      try {
        const supabaseUser = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user } } = await supabaseUser.auth.getUser()

        if (user) {
          ttUser.email = user.email || ''
          ttUser.external_id = user.id

          // جلب الجوال
          const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )
          try {
            const { data: prof } = await supabaseAdmin.from('profiles').select('phone').eq('id', user.id).single()
            if (prof?.phone) ttUser.phone = prof.phone
          } catch (_) {}
        }
      } catch (_) {
        // مو مسجل دخول — عادي، نرسل بدون بيانات المستخدم
      }
    }

    // ── إرسال الحدث ──
    await sendTikTokEvent(event, ttUser, {
      value: value || 0,
      currency: currency || 'SAR',
      content_id: content_id || 'pricing_page',
      content_type: 'product',
    })

    return new Response(JSON.stringify({ ok: true, event }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('[track-event] Error:', e)
    return new Response(JSON.stringify({ error: 'خطأ: ' + (e as Error).message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
