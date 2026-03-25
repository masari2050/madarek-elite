import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://madarekelite.com',
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

    // ══════════════════════════════════════════
    //  1. مصادقة المستخدم
    // ══════════════════════════════════════════
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ error: 'يرجى تسجيل الدخول أولاً' }, 401)

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
    if (authErr || !user) return jsonRes({ error: 'يرجى تسجيل الدخول أولاً' }, 401)

    // ══════════════════════════════════════════
    //  2. قراءة الطلب
    // ══════════════════════════════════════════
    const { code, plan } = await req.json()
    if (!code) return jsonRes({ error: 'أدخل كود الكوبون' }, 400)

    const couponCode = code.trim().toUpperCase()
    console.log(`[apply-coupon] user=${user.id}, code=${couponCode}, plan=${plan || 'auto'}`)

    // ══════════════════════════════════════════
    //  3. جلب الكوبون من قاعدة البيانات
    // ══════════════════════════════════════════
    const { data: coupon, error: cpErr } = await supabaseAdmin
      .from('coupons').select('*').eq('code', couponCode).single()

    if (cpErr || !coupon) {
      // تسجيل المحاولة الفاشلة
      await _logRedemption(supabaseAdmin, user.id, couponCode, null, 'failed', 'كود غير صحيح')
      console.log(`[apply-coupon] FAIL: coupon not found`)
      return jsonRes({ error: 'الكود غير صحيح' }, 400)
    }

    // ══════════════════════════════════════════
    //  4. التحقق من الصلاحية
    // ══════════════════════════════════════════
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      await _logRedemption(supabaseAdmin, user.id, couponCode, coupon.id, 'failed', 'منتهي الصلاحية')
      console.log(`[apply-coupon] FAIL: expired`)
      return jsonRes({ error: 'انتهت صلاحية هذا الكود' }, 400)
    }

    // ══════════════════════════════════════════
    //  5. التحقق من الحد الأقصى للاستخدام
    // ══════════════════════════════════════════
    if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) {
      await _logRedemption(supabaseAdmin, user.id, couponCode, coupon.id, 'failed', 'تم استنفاد الاستخدامات')
      console.log(`[apply-coupon] FAIL: max uses reached`)
      return jsonRes({ error: 'تم استنفاد هذا الكود' }, 400)
    }

    // ══════════════════════════════════════════
    //  6. التحقق: هل المستخدم استخدم هذا الكوبون من قبل؟
    //     نتحقق من coupon_redemptions + payments
    // ══════════════════════════════════════════
    const { data: existingRedemption } = await supabaseAdmin
      .from('coupon_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_code', couponCode)
      .eq('status', 'success')
      .limit(1)
      .maybeSingle()

    if (existingRedemption) {
      console.log(`[apply-coupon] FAIL: already redeemed (coupon_redemptions)`)
      return jsonRes({ error: 'استخدمت هذا الكود مسبقاً' }, 400)
    }

    // فحص إضافي في payments (للتوافق مع البيانات القديمة)
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_code', couponCode)
      .eq('status', 'paid')
      .limit(1)
      .maybeSingle()

    if (existingPayment) {
      console.log(`[apply-coupon] FAIL: already used (payments table)`)
      return jsonRes({ error: 'استخدمت هذا الكود مسبقاً' }, 400)
    }

    // ══════════════════════════════════════════
    //  7. التحقق من نوع الباقة
    // ══════════════════════════════════════════
    if (coupon.plan_type !== 'all' && plan && coupon.plan_type !== plan) {
      const pn = coupon.plan_type === 'monthly' ? 'الشهرية' : 'السنوية'
      await _logRedemption(supabaseAdmin, user.id, couponCode, coupon.id, 'failed', `باقة غير متوافقة: ${plan}`)
      return jsonRes({ error: `هذا الكوبون للباقة ${pn} فقط` }, 400)
    }

    // ══════════════════════════════════════════
    //  8. حساب الخصم
    // ══════════════════════════════════════════
    const { data: settings } = await supabaseAdmin
      .from('site_settings').select('key, value')
      .in('key', ['price_monthly_original', 'price_yearly_original', 'discount_percent'])

    const sm: Record<string, number> = {}
    settings?.forEach((s: any) => sm[s.key] = parseFloat(s.value))

    const disc = sm['discount_percent'] || 0
    const durMonths = coupon.duration_months || (coupon.plan_type === 'yearly' ? 12 : 1)

    // تحديد نوع الاشتراك من المدة
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

    // ══════════════════════════════════════════
    //  9. لو مجاني → تفعيل مباشر
    // ══════════════════════════════════════════
    if (finalAmount <= 0) {
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + durMonths)

      // إدخال سجل الدفع
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

      // ✅ تفعيل الاشتراك عبر SECURITY DEFINER function (يتجاوز RLS)
      const { data: activateResult, error: rpcErr } = await supabaseAdmin
        .rpc('activate_subscription_by_coupon', {
          p_user_id: user.id,
          p_subscription_type: subType,
          p_duration_months: durMonths
        })

      if (rpcErr) {
        console.error('[apply-coupon] RPC activate error:', rpcErr.message)
        // Fallback: تحديث مباشر
        const { error: profErr } = await supabaseAdmin.from('profiles').update({
          subscription_type: subType,
          subscription_end: endDate.toISOString(),
        }).eq('id', user.id)

        if (profErr) {
          console.error('[apply-coupon] Fallback profile update error:', profErr.message)
          await _logRedemption(supabaseAdmin, user.id, couponCode, coupon.id, 'failed', 'فشل تحديث الملف الشخصي: ' + profErr.message)
          return jsonRes({ error: 'خطأ في تفعيل الاشتراك — تواصل مع الدعم' }, 500)
        }
      }

      // زيادة عداد استخدام الكوبون
      await supabaseAdmin.rpc('increment_coupon_usage', { p_code: couponCode })
        .catch(async () => {
          // fallback
          await supabaseAdmin.from('coupons')
            .update({ used_count: (coupon.used_count || 0) + 1 })
            .eq('code', couponCode)
        })

      // التحقق من نجاح التحديث فعلياً
      const { data: verify } = await supabaseAdmin
        .from('profiles')
        .select('subscription_type, subscription_end')
        .eq('id', user.id)
        .single()

      console.log(`[apply-coupon] ✅ Verify: type=${verify?.subscription_type}, end=${verify?.subscription_end}`)

      if (!verify || verify.subscription_type === 'free' || !verify.subscription_type) {
        console.error('[apply-coupon] ❌ PROFILE UPDATE FAILED SILENTLY!')
        await _logRedemption(supabaseAdmin, user.id, couponCode, coupon.id, 'failed', 'تحديث الملف الشخصي فشل صامتاً')
        return jsonRes({ error: 'فشل تفعيل الاشتراك — تواصل مع الدعم عبر الواتساب' }, 500)
      }

      // ✅ تسجيل الاستخدام الناجح
      await _logRedemption(supabaseAdmin, user.id, couponCode, coupon.id, 'success', null,
        coupon.discount_type, coupon.discount_value, 0, subType, durMonths)

      return jsonRes({
        success: true,
        free: true,
        plan: subType,
        subscription_type: verify.subscription_type,
        subscription_end: verify.subscription_end,
        expires: new Date(verify.subscription_end).toISOString().split('T')[0],
        message: `تم تفعيل اشتراكك ال${subType === 'yearly' ? 'سنوي' : 'شهري'} مجاناً!`
      })
    }

    // ══════════════════════════════════════════
    //  10. كوبون خصم → إرجاع معلومات الخصم للدفع
    // ══════════════════════════════════════════
    // تسجيل محاولة التحقق (pending — لم يُدفع بعد)
    await _logRedemption(supabaseAdmin, user.id, couponCode, coupon.id, 'pending', null,
      coupon.discount_type, coupon.discount_value, finalAmount, subType, durMonths)

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

// ══════════════════════════════════════════
//  Helper: تسجيل محاولة استخدام الكوبون
// ══════════════════════════════════════════
async function _logRedemption(
  sb: any, userId: string, code: string, couponId: string | null,
  status: string, reason: string | null,
  discType?: string, discValue?: number, finalAmount?: number,
  planType?: string, durMonths?: number
) {
  try {
    await sb.from('coupon_redemptions').insert({
      user_id: userId,
      coupon_code: code,
      coupon_id: couponId,
      status,
      failure_reason: reason,
      discount_type: discType || null,
      discount_value: discValue || null,
      final_amount: finalAmount || 0,
      plan_type: planType || null,
      duration_months: durMonths || 1,
    })
  } catch (e) {
    console.error('[apply-coupon] log redemption error:', e)
  }
}
