#!/usr/bin/env python3
"""
نسخة ٢ — تسريبات التحصيلي PDF
- مقاس مناسب للجوال (A5 portrait أصغر = 420×595 pt)
- شعار مدارك الفعلي (icon-512.png)
- ألوان الموقع: بنفسجي #6D5DF6 / ذهبي #F59E0B / navy #0F1128
- ٣ أسئلة لكل صفحة
- غلاف احترافي جديد
"""
import json, random, os, io
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
import arabic_reshaper
from bidi.algorithm import get_display
import qrcode

# ─── الخطوط ───
FONT_DIR = '/tmp/madarek_pdf/fonts'
pdfmetrics.registerFont(TTFont('Plex',   os.path.join(FONT_DIR, 'IBMPlexSansArabic-Regular.ttf')))
pdfmetrics.registerFont(TTFont('PlexM',  os.path.join(FONT_DIR, 'IBMPlexSansArabic-Medium.ttf')))
pdfmetrics.registerFont(TTFont('PlexSB', os.path.join(FONT_DIR, 'IBMPlexSansArabic-SemiBold.ttf')))
pdfmetrics.registerFont(TTFont('PlexB',  os.path.join(FONT_DIR, 'IBMPlexSansArabic-Bold.ttf')))

# ─── ألوان مدارك (من dashboard.html / index.html) ───
PRI       = HexColor('#6D5DF6')   # البنفسجي الرئيسي
PRI_DEEP  = HexColor('#5B4DD4')   # بنفسجي أعمق
PRI_LIGHT = HexColor('#8B7FFF')   # بنفسجي فاتح
HERO_1    = HexColor('#0F1128')   # navy جداً (بداية gradient الهيرو)
HERO_2    = HexColor('#1E1060')
HERO_3    = HexColor('#3B1FB0')
GOLD      = HexColor('#F59E0B')
GOLD_L    = HexColor('#FBBF24')
GOLD_LL   = HexColor('#FDE68A')
ACC       = HexColor('#FF8A3D')   # برتقالي accent
INK       = HexColor('#1A1D2E')
INK_2     = HexColor('#3D4058')
INK_3     = HexColor('#6B7094')
LINE      = HexColor('#E2E8F0')
SOFT      = HexColor('#F5F3EF')   # background الرئيسي
SOFT_2    = HexColor('#FAF8F5')
WHITE     = HexColor('#FFFFFF')
SUC       = HexColor('#22C55E')   # أخضر للإجابة الصحيحة فقط
SUC_BG    = HexColor('#DCFCE7')
YELLOW_BG = HexColor('#FEFCE8')
YELLOW_BR = HexColor('#FDE68A')
YELLOW_INK= HexColor('#92400E')

# ─── مقاس الصفحة: A5 portrait مع تعديل للجوال ───
PAGE_W, PAGE_H = A5   # 420 × 595 pt = مناسب للجوال (~14.8×21cm)

# ─── الشعار (الفعلي) ───
LOGO_PATH = '/Users/zahrani_iz7/Library/Mobile Documents/com~apple~CloudDocs/مدارك النخبة الرسمي/madarek-elite-fresh/icons/icon-512.png'

# ─── أرقام عربية ───
def ar_digits(s):
    return str(s).translate(str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩'))

def shape(text):
    if not text:
        return ''
    return get_display(arabic_reshaper.reshape(str(text)))

def draw_ar(c, text, x, y, font='Plex', size=12, color=INK, align='right'):
    c.setFont(font, size)
    c.setFillColor(color)
    shaped = shape(text)
    w = c.stringWidth(shaped, font, size)
    if align == 'right':   c.drawString(x - w, y, shaped)
    elif align == 'center':c.drawString(x - w/2, y, shaped)
    else:                  c.drawString(x, y, shaped)
    return w

def draw_en(c, text, x, y, font='Plex', size=12, color=INK, align='left'):
    c.setFont(font, size)
    c.setFillColor(color)
    w = c.stringWidth(str(text), font, size)
    if align == 'right':   c.drawString(x - w, y, str(text))
    elif align == 'center':c.drawString(x - w/2, y, str(text))
    else:                  c.drawString(x, y, str(text))
    return w

def draw_logo_real(c, cx, cy, size=40):
    """رسم شعار مدارك الفعلي (بنفسجي + تاج أبيض)."""
    img = ImageReader(LOGO_PATH)
    c.drawImage(img, cx - size/2, cy - size/2, size, size, mask='auto')

def draw_logo_white(c, cx, cy, size=40, color=WHITE, line_w=None):
    """رسم تاج أبيض فقط (بدون مربع بنفسجي) — للاستخدام على خلفيات ملوّنة.
    SVG path الأصلي: M 10 48 L 10 28 L 20 37 L 32 14 L 44 37 L 54 28 L 54 48 Z في viewBox 64x64.
    """
    if line_w is None: line_w = size * 0.06
    # نحوّل من إحداثيات SVG (top-left origin, y down) إلى PDF (bottom-left origin, y up)
    # نقطة الأصل: cx, cy = مركز الرسم
    # حجم النص: size
    # السلم: size/64
    scale = size / 64.0
    # نقاط التاج (PDF coordinates: نطرح من 64 ثم نضرب بالسلم)
    def pt(x, y):
        return (cx - size/2 + x * scale, cy + size/2 - y * scale)

    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(line_w)
    c.setLineCap(1); c.setLineJoin(1)

    # رسم التاج
    p = c.beginPath()
    p.moveTo(*pt(10, 48))
    p.lineTo(*pt(10, 28))
    p.lineTo(*pt(20, 37))
    p.lineTo(*pt(32, 14))
    p.lineTo(*pt(44, 37))
    p.lineTo(*pt(54, 28))
    p.lineTo(*pt(54, 48))
    p.close()
    c.drawPath(p, stroke=1, fill=0)
    # القاعدة (خط رفيع تحت)
    x1, y1 = pt(8, 52)
    x2, y2 = pt(56, 52)
    c.line(x1, y1, x2, y2)
    c.restoreState()

def make_qr(url, fg='#0F1128', bg='#FFFFFF'):
    qr = qrcode.QRCode(version=1, box_size=10, border=1, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(fill_color=fg, back_color=bg)
    buf = io.BytesIO(); img.save(buf, format='PNG'); buf.seek(0)
    return buf

def wrap_text(c, text, font, size, max_w):
    if not text: return ['']
    words = str(text).split(' ')
    lines, cur = [], []
    for w in words:
        test = ' '.join(cur + [w])
        if c.stringWidth(shape(test), font, size) <= max_w:
            cur.append(w)
        else:
            if cur: lines.append(' '.join(cur))
            cur = [w]
    if cur: lines.append(' '.join(cur))
    return lines

# ═══════════════════════════════════════════════
# الغلاف — نظيف، احترافي، بدون عناصر عشوائية
# ═══════════════════════════════════════════════
def draw_cover(c):
    """غلاف نظيف، تركيب مدروس، breathing space كافٍ، بدون عناصر زائدة."""
    # خلفية: gradient أعمق + موحّد
    steps = 80
    def lerp(a, b, t): return a + (b - a) * t
    c1 = (0x33/255, 0x26/255, 0xA0/255)  # top — أعمق
    c2 = (0x4B/255, 0x3E/255, 0xC4/255)  # middle
    c3 = (0x5B/255, 0x4D/255, 0xD4/255)  # bottom
    for i in range(steps):
        t = i / steps
        if t < 0.5:
            tt = t / 0.5
            r = lerp(c1[0], c2[0], tt); g = lerp(c1[1], c2[1], tt); b = lerp(c1[2], c2[2], tt)
        else:
            tt = (t - 0.5) / 0.5
            r = lerp(c2[0], c3[0], tt); g = lerp(c2[1], c3[1], tt); b = lerp(c2[2], c3[2], tt)
        c.setFillColorRGB(r, g, b)
        c.rect(0, PAGE_H * (1 - (i+1)/steps), PAGE_W, PAGE_H/steps + 1, fill=1, stroke=0)

    cx = PAGE_W / 2

    # إطار ذهبي
    c.saveState()
    c.setStrokeColorRGB(0.85, 0.45, 0.02, alpha=0.55)
    c.setLineWidth(0.6)
    c.rect(22, 22, PAGE_W - 44, PAGE_H - 44, fill=0, stroke=1)
    c.restoreState()

    DEEP_GOLD = HexColor('#D97706')
    BRIGHT_GOLD = HexColor('#F59E0B')

    # ─── TOP: هوية البراند ───
    draw_logo_white(c, cx, PAGE_H - 75, size=26, color=WHITE, line_w=1.6)
    draw_ar(c, 'مدارك النخبة', cx, PAGE_H - 102, font='PlexB', size=15, color=WHITE, align='center')
    draw_ar(c, 'منصة تدريب التحصيلي والقدرات', cx, PAGE_H - 119, font='Plex', size=8.5, color=HexColor('#C4B5FD'), align='center')

    c.setStrokeColor(DEEP_GOLD)
    c.setLineWidth(0.8)
    c.line(cx - 28, PAGE_H - 138, cx + 28, PAGE_H - 138)

    # ─── MIDDLE: العنوان ───
    c.setFillColorRGB(0.85, 0.45, 0.02, alpha=0.18)
    c.setStrokeColor(DEEP_GOLD)
    c.setLineWidth(0.7)
    c.roundRect(cx - 52, PAGE_H - 165, 104, 22, 11, fill=1, stroke=1)
    draw_ar(c, 'إصدار حصري', cx, PAGE_H - 159, font='PlexSB', size=10, color=BRIGHT_GOLD, align='center')

    draw_ar(c, 'تسريبات', cx, PAGE_H - 213, font='PlexB', size=44, color=WHITE, align='center')
    draw_ar(c, 'اختبار التحصيلي ١٤٤٧', cx, PAGE_H - 250, font='PlexB', size=23, color=DEEP_GOLD, align='center')

    # بادج اليوم — مع مسافة كافية (20pt gap)
    badge_y = PAGE_H - 305
    c.setFillColor(WHITE)
    c.roundRect(cx - 118, badge_y, 236, 32, 16, fill=1, stroke=0)
    draw_ar(c, 'اليوم الأول · الأربعاء ١٣ مايو', cx, badge_y + 10, font='PlexB', size=12, color=PRI_DEEP, align='center')

    # ─── INFO: 188 + chips (بدون blob) ───
    c.setStrokeColorRGB(1, 1, 1, alpha=0.18)
    c.setLineWidth(0.4)
    c.line(60, 245, PAGE_W - 60, 245)

    draw_en(c, '179', cx, 200, font='PlexB', size=56, color=BRIGHT_GOLD, align='center')
    draw_ar(c, 'سؤال محلول · من اختبارات سعودية حقيقية', cx, 182, font='PlexSB', size=10.5, color=WHITE, align='center')

    # chips
    chips_y = 140
    subjects = [('الرياضيات', '39'), ('الفيزياء', '44'), ('الكيمياء', '44'), ('الأحياء', '52')]
    cw = 72
    total_w = cw * 4 + 5 * 3
    sx = (PAGE_W - total_w) / 2
    for i, (s, n) in enumerate(subjects):
        x = sx + (cw + 5) * i
        c.setFillColorRGB(1, 1, 1, alpha=0.08)
        c.setStrokeColorRGB(1, 1, 1, alpha=0.16)
        c.setLineWidth(0.5)
        c.roundRect(x, chips_y, cw, 30, 6, fill=1, stroke=1)
        draw_ar(c, s, x + cw/2, chips_y + 18, font='PlexSB', size=9.5, color=WHITE, align='center')
        draw_ar(c, n + ' سؤال', x + cw/2, chips_y + 6, font='Plex', size=7.5, color=BRIGHT_GOLD, align='center')

    c.setStrokeColorRGB(1, 1, 1, alpha=0.18)
    c.setLineWidth(0.4)
    c.line(60, 125, PAGE_W - 60, 125)

    # ─── BOTTOM: CTA ───
    c.setFillColor(DEEP_GOLD)
    c.roundRect(cx - 96, 75, 192, 30, 15, fill=1, stroke=0)
    draw_en(c, 'madarekelite.com', cx, 85, font='PlexB', size=13, color=WHITE, align='center')
    draw_ar(c, 'تدرّب · راجع · تفوّق', cx, 55, font='PlexM', size=9.5, color=HexColor('#E0D7FF'), align='center')

# ═══════════════════════════════════════════════
# فاصل المادة — نظيف، typography-first، بدون عناصر عشوائية
# ═══════════════════════════════════════════════
def draw_subject_divider(c, subject, count):
    # خلفية: نفس gradient الغلاف (بنفسجي البراند)
    steps = 60
    def lerp(a, b, t): return a + (b - a) * t
    c1 = (0x5B/255, 0x4D/255, 0xD4/255)
    c2 = (0x6D/255, 0x5D/255, 0xF6/255)
    c3 = (0x8B/255, 0x7F/255, 0xFF/255)
    for i in range(steps):
        t = i / steps
        if t < 0.55:
            tt = t / 0.55
            r = lerp(c1[0], c2[0], tt); g = lerp(c1[1], c2[1], tt); b = lerp(c1[2], c2[2], tt)
        else:
            tt = (t - 0.55) / 0.45
            r = lerp(c2[0], c3[0], tt); g = lerp(c2[1], c3[1], tt); b = lerp(c2[2], c3[2], tt)
        c.setFillColorRGB(r, g, b)
        c.rect(0, PAGE_H * (1 - (i+1)/steps), PAGE_W, PAGE_H/steps + 1, fill=1, stroke=0)

    # إطار رفيع ذهبي
    c.saveState()
    c.setStrokeColorRGB(0.96, 0.62, 0.04, alpha=0.35)
    c.setLineWidth(0.5)
    c.rect(20, 20, PAGE_W - 40, PAGE_H - 40, fill=0, stroke=1)
    c.restoreState()

    cx = PAGE_W / 2

    # ─── الشعار الأبيض في الأعلى (صغير، نظيف) ───
    draw_logo_white(c, cx, PAGE_H - 90, size=42, color=WHITE, line_w=2.3)

    # ─── كتلة العنوان الرئيسية (في الوسط) ───
    # خط ذهبي رفيع علوي
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(cx - 24, PAGE_H/2 + 60, cx + 24, PAGE_H/2 + 60)

    # كلمة "مادة" (صغيرة، فوق الاسم)
    draw_ar(c, 'مادة', cx, PAGE_H/2 + 36, font='PlexM', size=12, color=HexColor('#C4B5FD'), align='center')

    # اسم المادة الكبير
    draw_ar(c, subject, cx, PAGE_H/2 - 10, font='PlexB', size=54, color=WHITE, align='center')

    # خط ذهبي رفيع تحت
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(cx - 24, PAGE_H/2 - 32, cx + 24, PAGE_H/2 - 32)

    # بادج العدد
    c.setFillColor(WHITE)
    c.roundRect(cx - 80, PAGE_H/2 - 78, 160, 32, 16, fill=1, stroke=0)
    draw_ar(c, ar_digits(count) + ' سؤال محلول مع شرح', cx, PAGE_H/2 - 68, font='PlexB', size=11, color=PRI_DEEP, align='center')

    # ─── اسم البراند صغير تحت ───
    draw_ar(c, 'مدارك النخبة', cx, 70, font='PlexSB', size=11, color=WHITE, align='center')
    draw_ar(c, 'madarekelite.com', cx, 52, font='Plex', size=9, color=HexColor('#A78BFA'), align='center')

# ═══════════════════════════════════════════════
# Header + Footer للصفحات الداخلية
# ═══════════════════════════════════════════════
def draw_header_footer(c, page_num, total, subject_label=''):
    # Header
    c.saveState()
    # شريط بنفسجي رفيع
    c.setFillColor(PRI)
    c.rect(0, PAGE_H - 32, PAGE_W, 32, fill=1, stroke=0)
    # خط ذهبي تحت الـheader
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(0, PAGE_H - 32, PAGE_W, PAGE_H - 32)

    # شعار أبيض (مندمج مع البنفسجي) + اسم البراند (يمين الـheader)
    draw_logo_white(c, PAGE_W - 22, PAGE_H - 16, size=16, color=WHITE, line_w=1.4)
    draw_ar(c, 'مدارك النخبة', PAGE_W - 36, PAGE_H - 20, font='PlexB', size=10, color=WHITE, align='right')

    # عنوان (يسار)
    draw_ar(c, 'تسريبات التحصيلي · اليوم الأول', 12, PAGE_H - 20, font='PlexM', size=8.5, color=HexColor('#E5E1FF'), align='left')
    c.restoreState()

    # Footer مع QR صغير ورابط الموقع
    c.saveState()
    c.setFillColor(SOFT)
    c.rect(0, 0, PAGE_W, 32, fill=1, stroke=0)

    # QR صغير على اليسار — يحوّل للصفحة الرئيسية مباشرة
    qr_size = 22
    qr_img = make_qr('https://madarekelite.com')
    c.drawImage(ImageReader(qr_img), 8, 5, qr_size, qr_size, mask='auto')

    # نص بجانب الـQR (يسار) — استخدام draw_ar للعربي
    draw_ar(c, 'مدارك النخبة', 34, 18, font='PlexSB', size=8, color=INK_2, align='left')
    draw_en(c, 'madarekelite.com', 34, 9, font='Plex', size=7, color=INK_3, align='left')

    # رقم الصفحة في الوسط
    draw_en(c, f'{page_num} / {total}', PAGE_W/2, 14, font='PlexM', size=8, color=INK_3, align='center')

    # اسم المادة على اليمين
    if subject_label:
        draw_ar(c, subject_label, PAGE_W - 14, 14, font='PlexSB', size=8.5, color=PRI, align='right')

    c.restoreState()

# ═══════════════════════════════════════════════
# حساب ارتفاع السؤال قبل الرسم (لـsmart pagination)
# ═══════════════════════════════════════════════
def estimate_question_height(c, q_data):
    margin = 14
    card_w = PAGE_W - 2 * margin
    h = 20 + 4  # شريط الرقم
    qtext = q_data['question_text']
    qfont, qsize = 'PlexSB', 10
    max_w = card_w - 18
    qlines = wrap_text(c, qtext, qfont, qsize, max_w)
    h += len(qlines) * (qsize + 3) + 8 + 4  # نص السؤال
    if q_data.get('image_url'):
        h += 100 + 4  # ارتفاع الصورة + هامش
    h += (22 + 3) * 2 + 6  # خيارات 2x2
    return h

# ═══════════════════════════════════════════════
# سؤال واحد (مضغوط للجوال)
# ═══════════════════════════════════════════════
def draw_question(c, q_num, q_data, y_top):
    """v4: 4 questions/page. No QR per question — brand QR in page footer."""
    margin = 14
    card_x = margin
    card_w = PAGE_W - 2 * margin
    cur_y = y_top

    # شريط الرقم + المادة·الموضوع — مدمج وصغير
    bar_h = 20
    c.setFillColor(HERO_1)
    c.roundRect(card_x, cur_y - bar_h, card_w, bar_h, 5, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.roundRect(card_x + 5, cur_y - bar_h + 3, 26, bar_h - 6, 6, fill=1, stroke=0)
    draw_en(c, str(q_num), card_x + 5 + 13, cur_y - bar_h + 7, font='PlexB', size=9.5, color=HERO_1, align='center')
    subj_topic = q_data['subject'] + (' · ' + q_data['topic'] if q_data.get('topic') else '')
    draw_ar(c, subj_topic, card_x + card_w - 8, cur_y - bar_h + 7, font='PlexSB', size=8, color=WHITE, align='right')
    cur_y -= bar_h + 4

    # نص السؤال — حجم 10
    qtext = q_data['question_text']
    qfont, qsize = 'PlexSB', 10
    c.setFont(qfont, qsize)
    max_w = card_w - 18
    lines = wrap_text(c, qtext, qfont, qsize, max_w)
    qbox_h = len(lines) * (qsize + 3) + 8
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.roundRect(card_x, cur_y - qbox_h, card_w, qbox_h, 4, fill=1, stroke=1)
    for i, ln in enumerate(lines):
        draw_ar(c, ln, card_x + card_w - 9, cur_y - 11 - i*(qsize+3), font=qfont, size=qsize, color=INK, align='right')
    cur_y -= qbox_h + 4

    # صورة السؤال (لو موجودة)
    img_url = q_data.get('image_url')
    if img_url:
        try:
            import urllib.request, io as _io
            cache_dir = '/tmp/madarek_pdf/img_cache'
            os.makedirs(cache_dir, exist_ok=True)
            fname = img_url.rsplit('/', 1)[-1]
            cached = os.path.join(cache_dir, fname)
            if not os.path.exists(cached):
                urllib.request.urlretrieve(img_url, cached)
            # حجم الصورة في PDF
            img_h = 100
            img_w = 160  # نسبة 1.6:1 (مثل ما رسمنا 720x420 / 600x600)
            img_x = card_x + (card_w - img_w) / 2
            c.drawImage(cached, img_x, cur_y - img_h, img_w, img_h, mask='auto')
            cur_y -= img_h + 4
        except Exception:
            pass  # لو فشل التحميل، نتجاوز بدون كسر

    # خيارات 2x2 — مضغوطة
    choices = q_data['choices'] if isinstance(q_data['choices'], list) else json.loads(q_data['choices'])
    correct = q_data['correct_index']
    letters = ['أ', 'ب', 'ج', 'د']
    col_w = (card_w - 5) / 2
    row_h = 22

    for i in range(4):
        col = 1 - (i % 2)
        row = i // 2
        cx = card_x + col * (col_w + 5)
        cy = cur_y - row * (row_h + 3) - row_h

        is_correct = (i == correct)
        bg = SUC_BG if is_correct else WHITE
        br = SUC if is_correct else LINE
        ink = HexColor('#15803D') if is_correct else INK

        c.setFillColor(bg)
        c.setStrokeColor(br)
        c.setLineWidth(1 if is_correct else 0.5)
        c.roundRect(cx, cy, col_w, row_h, 4, fill=1, stroke=1)

        letter_bg = SUC if is_correct else SOFT
        letter_fg = WHITE if is_correct else INK_3
        c.setFillColor(letter_bg)
        c.circle(cx + col_w - 9, cy + row_h/2, 6, fill=1, stroke=0)
        draw_ar(c, letters[i], cx + col_w - 9, cy + row_h/2 - 2.5, font='PlexB', size=7.5, color=letter_fg, align='center')

        ch_text = str(choices[i])
        max_ch_w = col_w - 22
        for sz in [8.5, 8, 7.5, 7]:
            if c.stringWidth(shape(ch_text), 'PlexM', sz) <= max_ch_w:
                draw_ar(c, ch_text, cx + col_w - 19, cy + row_h/2 - 2.5, font='PlexM', size=sz, color=ink, align='right')
                break
        else:
            draw_ar(c, ch_text, cx + col_w - 19, cy + row_h/2 - 2.5, font='PlexM', size=6.5, color=ink, align='right')

    cur_y -= (row_h + 3) * 2 + 6
    return cur_y

# ═══════════════════════════════════════════════
# بناء النموذج
# ═══════════════════════════════════════════════
def build(out_path, sample_only=False):
    # نقرأ الأسئلة النظيفة (بدون الأسئلة اللي تحتاج صور بدون صور)
    with open('/tmp/madarek_pdf/all_q_clean.json') as f:
        all_q = json.load(f)

    # خلط لكسر ترتيب يلو/همّة (seed ثابت)
    random.seed(2026)
    random.shuffle(all_q)

    by_subj = {}
    for q in all_q:
        by_subj.setdefault(q['subject'], []).append(q)

    # ترتيب المواد + اختيار العيّنة أو كل الأسئلة
    SUBJECT_ORDER = ['الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء']
    if sample_only:
        per_subj = {'الرياضيات': by_subj.get('رياضيات', [])[:3],
                    'الأحياء':   by_subj.get('أحياء', [])[:3]}
        subjects_to_render = ['الرياضيات', 'الأحياء']
    else:
        per_subj = {
            'الرياضيات': by_subj.get('رياضيات', []),
            'الفيزياء':  by_subj.get('فيزياء', []),
            'الكيمياء':  by_subj.get('كيمياء', []),
            'الأحياء':   by_subj.get('أحياء', []),
        }
        subjects_to_render = SUBJECT_ORDER

    # render_questions — يحسب pagination
    def render_questions(c, questions, subject_label, page_num_start, total_pages):
        TOP_Y = PAGE_H - 42
        BOTTOM_Y = 30
        page_num = page_num_start
        draw_header_footer(c, page_num, total_pages, subject_label)
        cur_y = TOP_Y
        q_idx = 1
        for q in questions:
            est_h = estimate_question_height(c, q)
            if cur_y - est_h < BOTTOM_Y and cur_y < TOP_Y:
                c.showPage()
                page_num += 1
                draw_header_footer(c, page_num, total_pages, subject_label)
                cur_y = TOP_Y
            cur_y = draw_question(c, q_idx, q, cur_y)
            cur_y -= 6
            q_idx += 1
        return page_num

    # ─── حساب total_pages مسبقاً ───
    # غلاف + (4 فواصل + صفحات أسئلة لكل مادة) + ختام
    # نحاكي البناء لحساب الصفحات
    def estimate_pages():
        total = 1  # cover
        for s in subjects_to_render:
            total += 1  # subject divider
            # حساب أسئلة هذه المادة
            page_h_usable = (PAGE_H - 42) - 30
            cur_y = PAGE_H - 42
            for q in per_subj[s]:
                eh = estimate_question_height(c_temp, q)
                if cur_y - eh < 30 and cur_y < PAGE_H - 42:
                    total += 1
                    cur_y = PAGE_H - 42
                cur_y -= eh + 6
            total += 1  # last page of subject
        total += 1  # closing
        return total

    # canvas مؤقت للحساب
    import io as _io
    _buf = _io.BytesIO()
    c_temp = canvas.Canvas(_buf, pagesize=A5)
    pdfmetrics.registerFont  # already registered globally
    total_pages = estimate_pages()
    del c_temp, _buf

    c = canvas.Canvas(out_path, pagesize=A5)
    c.setTitle('تسريبات التحصيلي ١٤٤٧ - اليوم الأول')
    c.setAuthor('مدارك النخبة')
    c.setSubject('تسريبات التحصيلي - الفترة الأولى - الأربعاء 13 مايو 2026')

    # ─── الغلاف ───
    draw_cover(c); c.showPage()
    current_page = 2

    # ─── المواد ───
    for subject in subjects_to_render:
        questions = per_subj[subject]
        count = len(questions)
        # فاصل المادة
        draw_subject_divider(c, subject, str(count))
        c.showPage()
        current_page += 1
        # الأسئلة
        last_pg = render_questions(c, questions, subject, current_page, total_pages)
        c.showPage()
        current_page = last_pg + 1

    # ─── صفحة الختام ───
    # نفس gradient الغلاف
    steps = 80
    def lerp2(a, b, t): return a + (b - a) * t
    c1c = (0x5B/255, 0x4D/255, 0xD4/255)
    c2c = (0x6D/255, 0x5D/255, 0xF6/255)
    c3c = (0x8B/255, 0x7F/255, 0xFF/255)
    for i in range(steps):
        t = i / steps
        if t < 0.55:
            tt = t / 0.55
            r = lerp2(c1c[0], c2c[0], tt); g = lerp2(c1c[1], c2c[1], tt); b = lerp2(c1c[2], c2c[2], tt)
        else:
            tt = (t - 0.55) / 0.45
            r = lerp2(c2c[0], c3c[0], tt); g = lerp2(c2c[1], c3c[1], tt); b = lerp2(c2c[2], c3c[2], tt)
        c.setFillColorRGB(r, g, b)
        c.rect(0, PAGE_H * (1 - (i+1)/steps), PAGE_W, PAGE_H/steps + 1, fill=1, stroke=0)
    # إطار
    c.setStrokeColorRGB(0.96, 0.62, 0.04, alpha=0.4)
    c.setLineWidth(0.5)
    c.rect(20, 20, PAGE_W - 40, PAGE_H - 40, fill=0, stroke=1)

    cx = PAGE_W / 2
    draw_logo_white(c, cx, PAGE_H - 110, size=42, color=WHITE, line_w=2.3)
    draw_ar(c, 'مدارك النخبة', cx, PAGE_H - 150, font='PlexB', size=18, color=WHITE, align='center')
    draw_ar(c, 'انتهى الإصدار', cx, PAGE_H - 200, font='PlexB', size=22, color=GOLD, align='center')

    # رسالة شكر
    draw_ar(c, 'شكراً لاختيارك مدارك النخبة.', cx, PAGE_H - 260, font='PlexSB', size=12, color=WHITE, align='center')
    draw_ar(c, 'الإصدارات القادمة تُنشر فور صدور كل فترة.', cx, PAGE_H - 280, font='Plex', size=10, color=HexColor('#E5E1FF'), align='center')

    # ميزات
    feats_y = PAGE_H - 320
    feats = ['تسريبات أوّل بأوّل', 'شرح بسيط لكل سؤال', 'تدريب ذكي + اختبارات محاكية']
    for i, f in enumerate(feats):
        draw_ar(c, '◆ ' + f, cx, feats_y - i*22, font='PlexM', size=10.5, color=WHITE, align='center')

    # CTA
    c.setFillColorRGB(0.96, 0.62, 0.04, alpha=0.95)
    c.roundRect(cx - 100, 130, 200, 32, 16, fill=1, stroke=0)
    draw_en(c, 'madarekelite.com', cx, 142, font='PlexB', size=13, color=HERO_1, align='center')
    draw_ar(c, 'سجّل الآن وافتح ٤٬٢٠٠+ سؤال', cx, 105, font='PlexSB', size=11, color=WHITE, align='center')

    # تواصل
    draw_ar(c, 'للدعم: واتساب 966553339885+', cx, 75, font='Plex', size=9.5, color=HexColor('#E5E1FF'), align='center')
    draw_ar(c, '@madarekelite', cx, 55, font='Plex', size=9, color=HexColor('#C4B5FD'), align='center')

    c.save()
    # عدّ الصفحات الفعلية
    import fitz
    doc = fitz.open(out_path)
    print(f'PDF saved: {out_path}')
    print(f'Pages: {doc.page_count} | A5 portrait (420×595 pt) | mobile-friendly')

if __name__ == '__main__':
    import sys
    if '--sample' in sys.argv:
        build('/tmp/madarek_pdf/sample_v2.pdf', sample_only=True)
    else:
        build('/tmp/madarek_pdf/tahsili_v4.pdf', sample_only=False)
