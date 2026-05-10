// ═══════════════════════════════════════════════════════════════
// Edge Function: verify-iap-receipt
// ───────────────────────────────────────────────────────────────
// التحقّق من فواتير Apple IAP و Google Play Billing.
// يُستدعى من التطبيق بعد ما المستخدم يدفع.
//
// المنطق:
//   1. يستلم { platform: 'ios'|'android', receipt: '...', product_id, user_id }
//   2. يرسل receipt لـ Apple/Google API
//   3. يتحقّق من الصلاحية + يستخرج expires_date + transaction_id
//   4. يستدعي record_iap_purchase RPC (يحدّث profiles + iap_subscriptions)
//   5. يُرجع { success, expires_at, plan_type }
//
// Apple:
//   - Sandbox: https://sandbox.itunes.apple.com/verifyReceipt
//   - Production: https://buy.itunes.apple.com/verifyReceipt
//   - حل قياسي: نجرّب production أولاً، لو الـ status = 21007 نتحوّل sandbox
//   - الـ shared secret من App Store Connect → App Information → App-Specific Shared Secret
//
// Google: (للمرحلة 3 — Android)
//   - يحتاج Service Account من Google Cloud Console
//   - androidpublisher.purchases.subscriptions.get
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── خرائط لربط product_id بـ plan_type ──
const PRODUCT_TO_PLAN: Record<string, 'monthly' | 'quarterly' | 'yearly'> = {
  'monthly_subscription':   'monthly',
  'quarterly_subscription': 'quarterly',
  'yearly_subscription':    'yearly',
  // أسماء بديلة مقبولة (فاضل المطور يستخدم أيها وقت إنشاء products في App Store Connect)
  'com.madarekelite.monthly':   'monthly',
  'com.madarekelite.quarterly': 'quarterly',
  'com.madarekelite.yearly':    'yearly',
}

const APPLE_PROD_URL = 'https://buy.itunes.apple.com/verifyReceipt'
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt'

// CORS — مطابق لباقي Edge Functions (whitelist بدل *)
// التطبيق الـ native يرسل بدون Origin → نُرجع allowed[0] (لا يُؤثّر — native لا يفحص CORS).
// لو طلب جاء من متصفّح بأصل غير مدرج → CORS browser يرفضه.
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ['https://madarekelite.com', 'https://www.madarekelite.com']
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

type AppleVerifyResponse = {
  status: number
  environment?: 'Production' | 'Sandbox'
  receipt?: any
  latest_receipt?: string
  latest_receipt_info?: AppleTransaction[]
  pending_renewal_info?: AppleRenewalInfo[]
}

type AppleTransaction = {
  product_id: string
  transaction_id: string
  original_transaction_id: string
  purchase_date_ms: string
  expires_date_ms?: string
  cancellation_date_ms?: string
}

type AppleRenewalInfo = {
  product_id: string
  auto_renew_status: '0' | '1'
  expiration_intent?: string
}

serve(async (req) => {
  // ── CORS — closure scope ──
  const corsHeaders = getCorsHeaders(req)

  // helper: JSON response مع CORS (closure ليحصل على corsHeaders بدون race بين requests)
  const jsonRes = (payload: any, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonRes({ error: 'POST only' }, 405)
  }

  try {
    // ── 1) تحقّق من JWT ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonRes({ success: false, error: 'unauthorized' }, 401)
    }
    const jwt = authHeader.slice(7)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userRes?.user) {
      return jsonRes({ success: false, error: 'invalid token' }, 401)
    }
    const userId = userRes.user.id

    // ── 2) قراءة الـ payload ──
    const body = await req.json().catch(() => null)
    if (!body) return jsonRes({ success: false, error: 'invalid body' }, 400)

    const { platform, receipt, product_id } = body as {
      platform?: 'ios' | 'android'
      receipt?: string
      product_id?: string
    }

    if (!platform || !receipt || !product_id) {
      return jsonRes({ success: false, error: 'missing fields: platform/receipt/product_id' }, 400)
    }

    if (platform !== 'ios' && platform !== 'android') {
      return jsonRes({ success: false, error: 'platform must be ios or android' }, 400)
    }

    // ── 3) Android — للمرحلة الثانية، حالياً نُرجع رسالة TODO ──
    if (platform === 'android') {
      return jsonRes({
        success: false,
        error: 'Google Play verification is not implemented yet — coming in Phase 2',
      }, 501)
    }

    // ── 4) iOS — تحقّق من Apple ──
    const sharedSecret = Deno.env.get('APPLE_IAP_SHARED_SECRET')
    if (!sharedSecret) {
      console.error('[verify-iap-receipt] APPLE_IAP_SHARED_SECRET missing')
      return jsonRes({ success: false, error: 'server config error' }, 500)
    }

    const appleResp = await verifyAppleReceipt(receipt, sharedSecret)

    if (!appleResp || appleResp.status !== 0) {
      console.error('[verify-iap-receipt] Apple rejected:', appleResp?.status)
      return jsonRes({
        success: false,
        error: 'فشل التحقّق من فاتورة Apple',
        apple_status: appleResp?.status,
      }, 400)
    }

    // ── 5) إيجاد المعاملة الفعالة الأحدث لهذا product_id ──
    const allTx = appleResp.latest_receipt_info ?? []
    const matching = allTx.filter((tx) => tx.product_id === product_id)
    if (matching.length === 0) {
      return jsonRes({
        success: false,
        error: 'لم نجد معاملة لهذا المنتج في الفاتورة',
      }, 400)
    }

    // الأحدث (أكبر expires_date_ms)
    const latest = matching.reduce((a, b) => {
      const aExp = Number(a.expires_date_ms ?? 0)
      const bExp = Number(b.expires_date_ms ?? 0)
      return bExp > aExp ? b : a
    })

    // إذا cancellation_date_ms موجود → الاشتراك مسترد، لا نفعّل
    if (latest.cancellation_date_ms) {
      return jsonRes({
        success: false,
        error: 'هذا الاشتراك مُلغى/مسترد',
      }, 400)
    }

    // ── 6) auto_renew_status من pending_renewal_info ──
    const renewalInfo = (appleResp.pending_renewal_info ?? [])
      .find((r) => r.product_id === product_id)
    const autoRenew = renewalInfo?.auto_renew_status === '1'

    // ── 7) الـ plan_type ──
    const planType = PRODUCT_TO_PLAN[product_id]
    if (!planType) {
      return jsonRes({
        success: false,
        error: `product_id غير معروف: ${product_id}`,
      }, 400)
    }

    // ── 8) سجّل في DB عبر RPC ──
    const purchaseDate = new Date(Number(latest.purchase_date_ms))
    const expiresDate = new Date(Number(latest.expires_date_ms ?? 0))
    const environment = appleResp.environment === 'Sandbox' ? 'sandbox' : 'production'

    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('record_iap_purchase', {
      p_user_id:        userId,
      p_platform:       'ios',
      p_product_id:     product_id,
      p_plan_type:      planType,
      p_transaction_id: latest.transaction_id,
      p_original_tx_id: latest.original_transaction_id,
      p_receipt_data:   receipt.slice(0, 8000), // نقطعها لو طويلة جداً (DB column TEXT بلا حدّ لكن لتوفير المساحة)
      p_purchase_date:  purchaseDate.toISOString(),
      p_expires_at:     expiresDate.toISOString(),
      p_auto_renew:     autoRenew,
      p_environment:    environment,
    })

    if (rpcErr) {
      console.error('[verify-iap-receipt] RPC error:', rpcErr)
      return jsonRes({ success: false, error: rpcErr.message }, 500)
    }

    return jsonRes({
      success: true,
      plan_type: planType,
      expires_at: expiresDate.toISOString(),
      transaction_id: latest.transaction_id,
      environment,
      auto_renew: autoRenew,
    })

  } catch (e) {
    console.error('[verify-iap-receipt] uncaught:', e)
    return jsonRes({ success: false, error: (e as Error).message }, 500)
  }
})

// ── helper: التحقّق من Apple ──
// نجرّب production أولاً. لو رجّعت 21007 = الفاتورة sandbox → نُعيد التجربة sandbox.
// هذا السلوك القياسي اللي توصي به Apple نفسها.
async function verifyAppleReceipt(receipt: string, sharedSecret: string): Promise<AppleVerifyResponse | null> {
  const body = JSON.stringify({
    'receipt-data':            receipt,
    'password':                sharedSecret,
    'exclude-old-transactions': false,
  })

  // محاولة 1: production
  let resp = await fetch(APPLE_PROD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).then(r => r.json() as Promise<AppleVerifyResponse>).catch(() => null)

  // 21007 = "هذا الـ receipt من sandbox، جرّب على sandbox endpoint"
  if (resp?.status === 21007) {
    resp = await fetch(APPLE_SANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).then(r => r.json() as Promise<AppleVerifyResponse>).catch(() => null)
  }

  return resp
}
