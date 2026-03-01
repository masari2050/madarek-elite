/**
 * مدارك النخبة — نظام البنرات v3.0
 * ────────────────────────────────────
 * يُحمَّل في كل صفحة عبر: <script src="banner.js"></script>
 *
 * يدعم نوعين:
 *   1. البنر العام (public) — يظهر لكل الزوار (فوق الصفحة)
 *   2. البنر الداخلي (internal) — يظهر فقط للمسجلين داخل الصفحات المحددة
 *
 * يقرأ الإعدادات من جدول site_settings في Supabase
 * ────────────────────────────────────
 */

(function () {
  "use strict";

  // ══════════════════════════════════════════
  //  Supabase config
  // ══════════════════════════════════════════
  const SUPABASE_URL = "https://czzcmbxejxbotjemyuqf.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhibm90amVteXVxZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM5NjM3NjgyLCJleHAiOjIwNTUyMTM2ODJ9.oo_XX6RKFNhoFPMIlTZRSQT53LoG_mVNjFfzJkOINMk";

  // ══════════════════════════════════════════
  //  CSS — يُدرج مرة واحدة في <head>
  // ══════════════════════════════════════════
  const BANNER_CSS = `
    /* ── مدارك البنرات ── */
    @keyframes madarek-marquee-rtl {
      0%   { transform: translateX(0); }
      100% { transform: translateX(50%); }
    }

    .madarek-banner {
      width: 100%;
      overflow: hidden;
      position: relative;
      z-index: 9999;
      flex-shrink: 0;
    }

    .madarek-banner-static {
      width: 100%;
      text-align: center;
      padding: 10px 16px;
      direction: rtl;
    }

    .madarek-banner-static a {
      margin-right: 8px;
      text-decoration: underline;
      font-weight: 600;
    }

    .madarek-marquee-track {
      display: flex;
      width: max-content;
      animation: madarek-marquee-rtl var(--marquee-duration, 20s) linear infinite;
      direction: rtl;
    }

    .madarek-marquee-track:hover {
      animation-play-state: paused;
    }

    .madarek-marquee-item {
      white-space: nowrap;
      padding: 10px 48px;
      flex-shrink: 0;
    }

    .madarek-marquee-item a {
      margin-right: 8px;
      text-decoration: underline;
      font-weight: 600;
    }

    .madarek-banner-close {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.2);
      border: none;
      color: inherit;
      font-size: 16px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: background 0.2s;
    }
    .madarek-banner-close:hover {
      background: rgba(255,255,255,0.35);
    }

    /* ── البنر الداخلي ── */
    .madarek-internal-banner {
      width: 100%;
      overflow: hidden;
      position: relative;
      z-index: 9998;
      flex-shrink: 0;
    }
  `;

  // inject CSS once
  if (!document.getElementById("madarek-banner-styles")) {
    const styleEl = document.createElement("style");
    styleEl.id = "madarek-banner-styles";
    styleEl.textContent = BANNER_CSS;
    document.head.appendChild(styleEl);
  }

  // ══════════════════════════════════════════
  //  Helpers
  // ══════════════════════════════════════════

  /** اسم الصفحة الحالية */
  function getCurrentPage() {
    const path = window.location.pathname;
    const file = path.split("/").pop() || "index.html";
    return file.replace(".html", "");
  }

  /** هل المستخدم مسجل دخول؟ */
  function isLoggedIn() {
    try {
      const raw = localStorage.getItem("sb-czzcmbxejxbotjemyuqf-auth-token");
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!(data && data.access_token);
    } catch {
      return false;
    }
  }

  /** هل التاريخ الحالي ضمن النطاق؟ */
  function isWithinDateRange(from, to) {
    if (!from && !to) return true;
    const now = new Date();
    if (from && new Date(from) > now) return false;
    if (to && new Date(to) < now) return false;
    return true;
  }

  /** جلب إعدادات البنرات من Supabase */
  async function fetchSettings(keys) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/site_settings?key=in.(${keys.map(k => `"${k}"`).join(",")})&select=key,value`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      if (!res.ok) return {};
      const rows = await res.json();
      const map = {};
      rows.forEach((r) => (map[r.key] = r.value));
      return map;
    } catch (e) {
      console.warn("[Banner] فشل جلب الإعدادات:", e);
      return {};
    }
  }

  /** حذف أي بنر قديم hardcoded */
  function removeOldBanners() {
    // الطريقة 1: العنصر بالمعرف
    const old1 = document.getElementById("top-announcement-bar");
    if (old1) old1.remove();

    // الطريقة 2: البنر القديم بالكلاس
    document.querySelectorAll(".marquee-container").forEach((el) => {
      const parent = el.closest("div");
      if (parent) parent.remove();
    });

    // الطريقة 3: أي div فيه "مدارك النخبة تتطور" كنص
    document.querySelectorAll("div").forEach((el) => {
      if (
        el.children.length <= 3 &&
        el.textContent.includes("مدارك النخبة تتطور") &&
        !el.classList.contains("madarek-banner")
      ) {
        el.remove();
      }
    });
  }

  // ══════════════════════════════════════════
  //  البنر العام (Public Banner)
  // ══════════════════════════════════════════
  function buildPublicBanner(s) {
    const mode = s.banner_mode || "off";
    if (mode === "off") return null;

    const text = s.banner_text || "";
    if (!text.trim()) return null;

    // تحقق من التاريخ
    if (!isWithinDateRange(s.banner_from, s.banner_to)) return null;

    const bg = s.banner_bg || "#ec4899";
    const color = s.banner_color || "#ffffff";
    const size = s.banner_size || "14px";
    const motion = s.banner_motion || "static"; // static | marquee
    const closable = s.banner_closable === "true";
    const link = s.banner_link || "";
    const linkText = s.banner_link_text || "";

    // هل أغلقه المستخدم سابقاً؟
    const closedKey = "madarek_pub_banner_closed";
    if (closable && localStorage.getItem(closedKey) === text) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "madarek-banner";
    wrapper.id = "madarek-public-banner";
    wrapper.style.background = bg;
    wrapper.style.color = color;
    wrapper.style.fontSize = size;
    wrapper.style.fontFamily = "'Tajawal', sans-serif";

    // بناء نص البنر مع الرابط
    function buildText() {
      let html = text;
      if (link && linkText) {
        html += ` <a href="${link}" style="color:${color}">${linkText}</a>`;
      }
      return html;
    }

    if (motion === "marquee") {
      // ── Marquee سلس ──
      // نكرر النص 6 مرات عشان يغطي الشاشة + الحركة تكون seamless
      const track = document.createElement("div");
      track.className = "madarek-marquee-track";
      // نحسب المدة بناءً على طول النص
      const duration = Math.max(15, text.length * 0.4);
      track.style.setProperty("--marquee-duration", `${duration}s`);

      for (let i = 0; i < 8; i++) {
        const item = document.createElement("span");
        item.className = "madarek-marquee-item";
        item.innerHTML = buildText();
        track.appendChild(item);
      }
      wrapper.appendChild(track);
    } else {
      // ── Static ──
      const inner = document.createElement("div");
      inner.className = "madarek-banner-static";
      inner.innerHTML = buildText();
      wrapper.appendChild(inner);
    }

    // زر الإغلاق
    if (closable) {
      const btn = document.createElement("button");
      btn.className = "madarek-banner-close";
      btn.innerHTML = "✕";
      btn.title = "إغلاق";
      btn.onclick = () => {
        localStorage.setItem(closedKey, text);
        wrapper.remove();
      };
      wrapper.appendChild(btn);
    }

    return wrapper;
  }

  // ══════════════════════════════════════════
  //  البنر الداخلي (Internal Banner)
  // ══════════════════════════════════════════
  function buildInternalBanner(s) {
    const mode = s.internal_banner_mode || "off";
    if (mode === "off") return null;

    // لازم يكون مسجل دخول
    if (!isLoggedIn()) return null;

    const text = s.internal_banner_text || "";
    if (!text.trim()) return null;

    // تحقق من الصفحات
    const pages = s.internal_banner_pages || "all";
    if (pages !== "all" && pages !== "") {
      const allowed = pages.split(",").map((p) => p.trim().toLowerCase());
      const current = getCurrentPage().toLowerCase();
      if (!allowed.includes(current) && !allowed.includes("all")) return null;
    }

    // تحقق من التاريخ (إذا mode = date)
    if (mode === "date") {
      if (!isWithinDateRange(s.internal_banner_from, s.internal_banner_to)) return null;
    }

    // هل أغلقه المستخدم؟
    const closable = s.internal_banner_closable === "true";
    const closedKey = "madarek_int_banner_closed";
    if (closable && localStorage.getItem(closedKey) === text) return null;

    const bg = s.internal_banner_bg || "#10b981";
    const color = s.internal_banner_color || "#ffffff";
    const size = s.internal_banner_size || "13px";
    const motion = s.internal_banner_motion || "static";

    const wrapper = document.createElement("div");
    wrapper.className = "madarek-internal-banner";
    wrapper.id = "madarek-internal-banner";
    wrapper.style.background = bg;
    wrapper.style.color = color;
    wrapper.style.fontSize = size;
    wrapper.style.fontFamily = "'Tajawal', sans-serif";

    if (motion === "marquee") {
      const track = document.createElement("div");
      track.className = "madarek-marquee-track";
      const duration = Math.max(15, text.length * 0.4);
      track.style.setProperty("--marquee-duration", `${duration}s`);
      for (let i = 0; i < 8; i++) {
        const item = document.createElement("span");
        item.className = "madarek-marquee-item";
        item.textContent = text;
        track.appendChild(item);
      }
      wrapper.appendChild(track);
    } else {
      const inner = document.createElement("div");
      inner.className = "madarek-banner-static";
      inner.textContent = text;
      wrapper.appendChild(inner);
    }

    if (closable) {
      const btn = document.createElement("button");
      btn.className = "madarek-banner-close";
      btn.innerHTML = "✕";
      btn.title = "إغلاق";
      btn.onclick = () => {
        localStorage.setItem(closedKey, text);
        wrapper.remove();
      };
      wrapper.appendChild(btn);
    }

    return wrapper;
  }

  // ══════════════════════════════════════════
  //  Init — يُنفَّذ عند تحميل الصفحة
  // ══════════════════════════════════════════
  async function init() {
    // 1) حذف البنرات القديمة
    removeOldBanners();

    // 2) جلب الإعدادات
    const keys = [
      "banner_mode", "banner_text", "banner_bg", "banner_color",
      "banner_size", "banner_motion", "banner_closable",
      "banner_from", "banner_to", "banner_link", "banner_link_text",
      "internal_banner_mode", "internal_banner_text", "internal_banner_bg",
      "internal_banner_color", "internal_banner_size", "internal_banner_motion",
      "internal_banner_closable", "internal_banner_pages",
      "internal_banner_from", "internal_banner_to",
    ];

    const settings = await fetchSettings(keys);

    // 3) البنر العام — يُدرج كأول عنصر في body
    const pubBanner = buildPublicBanner(settings);
    if (pubBanner) {
      document.body.insertBefore(pubBanner, document.body.firstChild);
    }

    // 4) البنر الداخلي — يُدرج بعد البنر العام (أو كأول عنصر)
    const intBanner = buildInternalBanner(settings);
    if (intBanner) {
      const after = pubBanner || document.body.firstChild;
      if (after && after.nextSibling) {
        document.body.insertBefore(intBanner, after.nextSibling);
      } else {
        document.body.appendChild(intBanner);
      }
    }
  }

  // ══════════════════════════════════════════
  //  تشغيل
  // ══════════════════════════════════════════
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
