/**
 * TikTok Events API v1.3 (Server-Side)
 * يرسل أحداث التحويل لـ TikTok عبر الـ API بدون كشف التوكن للعميل
 *
 * إصلاح 5 أبريل 2026:
 * - إضافة external_id (هاش user ID) — ضروري لربط الأحداث
 * - إضافة ttp (كوكي TikTok _ttp) — ضروري للإسناد
 * - إضافة ttclid (TikTok Click ID) — ضروري لربط نقرة الإعلان
 * - إضافة test_event_code — لاختبار الأحداث من Events Manager
 * - تحسين بنية user_data حسب مواصفات TikTok API v1.3
 */

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text.trim().toLowerCase())
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface TikTokUserData {
  email?: string
  phone?: string
  external_id?: string    // user ID — يتهاش تلقائياً
  ip?: string
  user_agent?: string
  ttp?: string            // كوكي _ttp من TikTok pixel (بدون هاش)
  ttclid?: string         // TikTok Click ID من URL parameter
}

export interface TikTokEventOptions {
  value?: number
  currency?: string
  content_type?: string
  content_id?: string
  description?: string
  test_event_code?: string  // كود اختبار من Events Manager
}

export async function sendTikTokEvent(
  eventName: string,
  userData: TikTokUserData,
  options?: TikTokEventOptions
): Promise<void> {
  console.log(`[TikTok] Preparing event: ${eventName}`)
  const pixelId = Deno.env.get('TIKTOK_PIXEL_ID')
  const accessToken = Deno.env.get('TIKTOK_ACCESS_TOKEN')

  if (!pixelId || !accessToken) {
    console.log('[TikTok] Skipped — missing TIKTOK_PIXEL_ID or TIKTOK_ACCESS_TOKEN')
    return
  }

  try {
    // ═══════════════════════════════════════════
    // بناء بيانات المستخدم مع SHA256 hashing
    // TikTok يحتاج على الأقل واحد: email أو phone أو external_id
    // ═══════════════════════════════════════════
    const user: Record<string, string> = {}
    let identifiers = 0

    // 1. Email (SHA256)
    const rawEmail = (userData.email || '').trim().toLowerCase()
    if (rawEmail && rawEmail.includes('@')) {
      user.email = await sha256(rawEmail)
      identifiers++
    }

    // 2. Phone (SHA256) — تنسيق سعودي +966XXXXXXXXX
    if (userData.phone) {
      let phone = userData.phone.replace(/[\s\-()]/g, '')
      if (phone.startsWith('05')) phone = '+966' + phone.substring(1)
      else if (phone.startsWith('5') && phone.length === 9) phone = '+966' + phone
      else if (phone.startsWith('966') && !phone.startsWith('+')) phone = '+' + phone
      else if (!phone.startsWith('+')) phone = '+' + phone
      if (phone.length >= 12) {  // +966 + 9 digits = 13
        user.phone_number = await sha256(phone)
        identifiers++
      }
    }

    // 3. External ID (SHA256) — معرّف المستخدم الفريد
    if (userData.external_id) {
      user.external_id = await sha256(userData.external_id)
      identifiers++
    }

    // 4. IP (بدون هاش — TikTok يحتاجه plain)
    if (userData.ip) {
      user.ip = userData.ip
    }

    // 5. User Agent (بدون هاش)
    if (userData.user_agent) {
      user.user_agent = userData.user_agent
    }

    // 6. TikTok cookie _ttp (بدون هاش — معرّف الزيارة من pixel)
    if (userData.ttp) {
      user.ttp = userData.ttp
    }

    // 7. TikTok Click ID ttclid (بدون هاش — من URL parameter)
    if (userData.ttclid) {
      user.ttclid = userData.ttclid
    }

    // تحذير إذا ما فيه أي معرّف — TikTok ما يقدر يربط الحدث
    if (identifiers === 0 && !userData.ttp && !userData.ttclid) {
      console.warn(`[TikTok] ⚠️ No user identifiers for ${eventName} — event won't match!`)
    }

    // ═══════════════════════════════════════════
    // بناء بيانات الحدث
    // ═══════════════════════════════════════════
    const eventId = `${eventName}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const eventData: Record<string, any> = {
      event: eventName,
      event_time: Math.floor(Date.now() / 1000),
      user: user,
      event_id: eventId,
    }

    // ═══════════════════════════════════════════
    // Properties: value + contents + content_id
    // ═══════════════════════════════════════════
    if (options?.value !== undefined || options?.content_id) {
      // تحديد نوع الاشتراك
      const isYearly = options?.content_id === 'yearly' ||
                        options?.description?.includes('سنوي') ||
                        (options?.value && options.value > 100)
      const contentId = options?.content_id || (isYearly ? 'yearly' : 'monthly')
      const contentName = isYearly ? 'اشتراك سنوي — مدارك النخبة' : 'اشتراك شهري — مدارك النخبة'

      eventData.properties = {
        currency: options?.currency || 'SAR',
        content_type: options?.content_type || 'product',
        contents: [{
          content_id: contentId,
          content_name: contentName,
          content_category: 'subscription',
          price: options?.value || 0,
          quantity: 1,
        }],
      }
      // value خارج contents أيضاً (مطلوب من TikTok)
      if (options?.value !== undefined) {
        eventData.properties.value = options.value
      }
      if (options?.description) {
        eventData.properties.description = options.description
      }
    }

    // ═══════════════════════════════════════════
    // Payload النهائي
    // ═══════════════════════════════════════════
    const payload: Record<string, any> = {
      event_source: 'web',
      event_source_id: pixelId,
      data: [eventData],
    }

    // Test Event Code — للاختبار من Events Manager
    const testCode = options?.test_event_code || Deno.env.get('TIKTOK_TEST_EVENT_CODE')
    if (testCode) {
      payload.test_event_code = testCode
      console.log(`[TikTok] 🧪 Using test_event_code: ${testCode}`)
    }

    console.log(`[TikTok] Sending ${eventName}: identifiers=${identifiers}, ttp=${!!userData.ttp}, ttclid=${!!userData.ttclid}, ip=${!!userData.ip}`)

    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (result.code === 0) {
      console.log(`[TikTok] ✅ ${eventName} sent — event_id=${eventId}`)
    } else {
      console.error(`[TikTok] ❌ ${eventName} failed: code=${result.code}, msg=${result.message}`)
    }
  } catch (err) {
    // لا نوقف العملية الأصلية إذا فشل TikTok
    console.error(`[TikTok] Error "${eventName}":`, (err as Error).message)
  }
}
