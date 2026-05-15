#!/usr/bin/env python3
"""
بناء صور الأسئلة برمجياً — نظيفة بدون watermarks، بهوية مدارك النخبة.
"""
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
import math, os

FONT_DIR = '/tmp/madarek_pdf/fonts'
FONT_REG = ImageFont.truetype(f'{FONT_DIR}/IBMPlexSansArabic-Regular.ttf', 22)
FONT_BOLD = ImageFont.truetype(f'{FONT_DIR}/IBMPlexSansArabic-Bold.ttf', 24)
FONT_SMALL = ImageFont.truetype(f'{FONT_DIR}/IBMPlexSansArabic-Regular.ttf', 16)
FONT_TINY = ImageFont.truetype(f'{FONT_DIR}/IBMPlexSansArabic-Regular.ttf', 13)

BLACK = (15, 27, 23)
WHITE = (255, 255, 255)
INK = (31, 46, 42)
LIGHT = (180, 180, 180)
BRAND = (109, 93, 246)  # purple
GOLD = (217, 119, 6)
EMERALD = (16, 185, 129)

def shape_ar(t):
    return get_display(arabic_reshaper.reshape(t))

def base_canvas(w=720, h=420, color=False):
    img = Image.new('RGB', (w, h), WHITE)
    d = ImageDraw.Draw(img)
    # subtle brand mark bottom-right
    txt = shape_ar('مدارك النخبة')
    bbox = d.textbbox((0, 0), txt, font=FONT_TINY)
    tw = bbox[2] - bbox[0]
    d.text((w - tw - 12, h - 22), txt, font=FONT_TINY, fill=(200, 200, 210))
    return img, d

def save(img, name):
    out = f'/tmp/figs_out/{name}.png'
    img.save(out, optimize=True)
    return out

# ═══════════════════════════════════════════════
# 1. Function with vertical asymptote at x=0 (∞/-∞)
# ═══════════════════════════════════════════════
def fig_asymptote_x0():
    img, d = base_canvas()
    cx, cy = 360, 210
    # axes
    d.line([(60, cy), (660, cy)], fill=INK, width=2)
    d.line([(cx, 60), (cx, 360)], fill=INK, width=2)
    # arrows
    d.polygon([(660, cy), (650, cy-6), (650, cy+6)], fill=INK)
    d.polygon([(cx, 60), (cx-6, 70), (cx+6, 70)], fill=INK)
    # labels
    d.text((668, cy-12), 'x', font=FONT_BOLD, fill=INK)
    d.text((cx+8, 50), 'y', font=FONT_BOLD, fill=INK)
    # left branch (approaches -∞ from left)
    pts = []
    for x_px in range(80, cx-30, 4):
        x = (x_px - cx) / 50
        if x < 0:
            y = 1 / x  # negative, goes -inf as x→0-
            y_px = cy - y * 50
            if 80 <= y_px <= 350:
                pts.append((x_px, y_px))
    if len(pts) > 1:
        d.line(pts, fill=INK, width=3)
    # right branch (approaches +∞ from right)
    pts2 = []
    for x_px in range(cx+30, 660, 4):
        x = (x_px - cx) / 50
        if x > 0:
            y = 1 / x
            y_px = cy - y * 50
            if 80 <= y_px <= 350:
                pts2.append((x_px, y_px))
    if len(pts2) > 1:
        d.line(pts2, fill=INK, width=3)
    # dashed vertical asymptote
    for y in range(70, 360, 8):
        d.line([(cx, y), (cx, y+4)], fill=LIGHT, width=1)
    return save(img, 'asymptote_x0')

# ═══════════════════════════════════════════════
# 2. Parabola y = x² (opens upward, symmetric about y-axis)
# ═══════════════════════════════════════════════
def fig_parabola_y_x2():
    img, d = base_canvas()
    cx, cy = 360, 320
    d.line([(60, cy), (660, cy)], fill=INK, width=2)
    d.line([(cx, 30), (cx, 380)], fill=INK, width=2)
    d.polygon([(660, cy), (650, cy-6), (650, cy+6)], fill=INK)
    d.polygon([(cx, 30), (cx-6, 40), (cx+6, 40)], fill=INK)
    d.text((668, cy-12), 'x', font=FONT_BOLD, fill=INK)
    d.text((cx+8, 20), 'y', font=FONT_BOLD, fill=INK)
    pts = []
    for x_px in range(120, 600, 3):
        x = (x_px - cx) / 30
        y = x * x
        y_px = cy - y * 18
        if 40 <= y_px <= 360:
            pts.append((x_px, y_px))
    if len(pts) > 1:
        d.line(pts, fill=INK, width=3)
    return save(img, 'parabola_y_x2')

# ═══════════════════════════════════════════════
# 3. Discontinuous function — jump at x=0
# ═══════════════════════════════════════════════
def fig_jump_discontinuity():
    img, d = base_canvas()
    cx, cy = 360, 220
    d.line([(60, cy), (660, cy)], fill=INK, width=2)
    d.line([(cx, 60), (cx, 380)], fill=INK, width=2)
    d.polygon([(660, cy), (650, cy-6), (650, cy+6)], fill=INK)
    d.polygon([(cx, 60), (cx-6, 70), (cx+6, 70)], fill=INK)
    d.text((668, cy-12), 'x', font=FONT_BOLD, fill=INK)
    d.text((cx+8, 50), 'y', font=FONT_BOLD, fill=INK)
    # left branch: y = x - 1 for x < 0 (approaches -1 at x=0)
    d.line([(100, cy+150-100*0.8), (cx, cy+60)], fill=INK, width=3)
    # right branch: y = x + 1 for x > 0 (approaches 1 at x=0)
    d.line([(cx, cy-60), (620, cy-150+100*0.8)], fill=INK, width=3)
    # open circles at jump points
    d.ellipse([(cx-6, cy+54), (cx+6, cy+66)], outline=INK, width=2, fill=WHITE)
    d.ellipse([(cx-6, cy-66), (cx+6, cy-54)], outline=INK, width=2, fill=WHITE)
    return save(img, 'jump_discontinuity')

# ═══════════════════════════════════════════════
# 4. Vertical angles (counter-example to "common point → adjacent")
# ═══════════════════════════════════════════════
def fig_vertical_angles():
    img, d = base_canvas()
    # Show 2 intersecting lines forming vertical angles
    cx, cy = 360, 210
    # line 1 (rising)
    d.line([(160, 330), (560, 90)], fill=INK, width=3)
    # line 2 (falling)
    d.line([(160, 90), (560, 330)], fill=INK, width=3)
    # Label angles
    d.text((cx-22, cy-58), '∠1', font=FONT_BOLD, fill=BRAND)
    d.text((cx-22, cy+38), '∠2', font=FONT_BOLD, fill=BRAND)
    # arrows
    d.polygon([(560, 90), (550, 95), (555, 105)], fill=INK)
    d.polygon([(560, 330), (550, 325), (555, 315)], fill=INK)
    d.polygon([(160, 90), (170, 95), (165, 105)], fill=INK)
    d.polygon([(160, 330), (170, 325), (165, 315)], fill=INK)
    # caption
    txt = shape_ar('زاويتان متقابلتان بالرأس')
    bbox = d.textbbox((0,0), txt, font=FONT_SMALL)
    tw = bbox[2] - bbox[0]
    d.text(((720-tw)//2, 370), txt, font=FONT_SMALL, fill=INK)
    return save(img, 'vertical_angles')

# ═══════════════════════════════════════════════
# 5. Parallel lines with transversal — angles (3x-20)° and x°
# ═══════════════════════════════════════════════
def fig_parallel_lines_3x_20():
    img, d = base_canvas()
    # two horizontal parallel lines
    d.line([(80, 130), (640, 130)], fill=INK, width=3)
    d.line([(80, 300), (640, 300)], fill=INK, width=3)
    # transversal
    d.line([(220, 60), (520, 370)], fill=INK, width=3)
    # arrows on parallel lines
    for y in [130, 300]:
        d.polygon([(640, y), (628, y-6), (628, y+6)], fill=INK)
        d.polygon([(80, y), (92, y-6), (92, y+6)], fill=INK)
    # angle labels
    d.text((280, 95), shape_ar('(3x − 20)°'), font=FONT_BOLD, fill=BRAND)
    d.text((400, 310), shape_ar('x°'), font=FONT_BOLD, fill=BRAND)
    return save(img, 'parallel_lines_3x_20')

# ═══════════════════════════════════════════════
# 6. Isosceles triangle (x, 4) (0,0) (10,0)
# ═══════════════════════════════════════════════
def fig_isosceles_triangle():
    img, d = base_canvas()
    # coordinate system
    d.line([(80, 340), (660, 340)], fill=INK, width=2)
    d.line([(140, 60), (140, 380)], fill=INK, width=2)
    d.polygon([(660, 340), (650, 334), (650, 346)], fill=INK)
    d.polygon([(140, 60), (134, 70), (146, 70)], fill=INK)
    d.text((668, 328), 'x', font=FONT_BOLD, fill=INK)
    d.text((148, 50), 'y', font=FONT_BOLD, fill=INK)
    # triangle: base from (0,0)=(140,340) to (10,0)=(540,340), apex at (5,4) marked with x
    A = (140, 340)
    B = (540, 340)
    apex = (340, 140)
    d.line([A, B], fill=INK, width=3)
    d.line([A, apex], fill=INK, width=3)
    d.line([B, apex], fill=INK, width=3)
    # marks for equal sides
    # midpoint of A-apex
    m1 = ((A[0]+apex[0])//2, (A[1]+apex[1])//2)
    d.line([(m1[0]-7, m1[1]-12), (m1[0]+7, m1[1]-4)], fill=INK, width=2)
    d.line([(m1[0]+0, m1[1]-12), (m1[0]+14, m1[1]-4)], fill=INK, width=2)
    m2 = ((B[0]+apex[0])//2, (B[1]+apex[1])//2)
    d.line([(m2[0]-7, m2[1]-12), (m2[0]+7, m2[1]-4)], fill=INK, width=2)
    d.line([(m2[0]+0, m2[1]-12), (m2[0]+14, m2[1]-4)], fill=INK, width=2)
    # labels
    d.text((130, 352), '(0,0)', font=FONT_SMALL, fill=INK)
    d.text((520, 352), '(10,0)', font=FONT_SMALL, fill=INK)
    d.text((324, 110), '(x, 4)', font=FONT_SMALL, fill=BRAND)
    return save(img, 'isosceles_triangle')

# ═══════════════════════════════════════════════
# 7. Isosceles trapezoid on x-axis
# ═══════════════════════════════════════════════
def fig_isosceles_trapezoid():
    img, d = base_canvas()
    d.line([(80, 340), (660, 340)], fill=INK, width=2)
    d.line([(140, 60), (140, 380)], fill=INK, width=2)
    d.polygon([(660, 340), (650, 334), (650, 346)], fill=INK)
    d.polygon([(140, 60), (134, 70), (146, 70)], fill=INK)
    # Trapezoid: L(a,0), T(b,0), A(0,c), M(?,c)
    # base on x-axis from L (240,340) to T (500,340)
    # top corners: A(180,140), M(560,140) — wider at top isosceles trapezoid
    L = (260, 340); T = (480, 340)
    A = (200, 140); M = (540, 140)
    d.line([L, T], fill=INK, width=3)
    d.line([A, M], fill=INK, width=3)
    d.line([L, A], fill=INK, width=3)
    d.line([T, M], fill=INK, width=3)
    # labels
    d.text((250, 352), 'L(a, 0)', font=FONT_SMALL, fill=INK)
    d.text((476, 352), 'T(b, 0)', font=FONT_SMALL, fill=INK)
    d.text((140, 124), 'A(0, c)', font=FONT_SMALL, fill=BRAND)
    d.text((552, 124), 'M', font=FONT_BOLD, fill=BRAND)
    return save(img, 'isosceles_trapezoid')

# ═══════════════════════════════════════════════
# 8. Parallel lines with 70° angle and x angle
# ═══════════════════════════════════════════════
def fig_parallel_70():
    img, d = base_canvas()
    d.line([(80, 130), (640, 130)], fill=INK, width=3)
    d.line([(80, 300), (640, 300)], fill=INK, width=3)
    d.line([(540, 60), (200, 370)], fill=INK, width=3)
    for y in [130, 300]:
        d.polygon([(640, y), (628, y-6), (628, y+6)], fill=INK)
        d.polygon([(80, y), (92, y-6), (92, y+6)], fill=INK)
    # 70° at top intersection (right of transversal)
    d.text((460, 95), '70°', font=FONT_BOLD, fill=BRAND)
    # x at bottom intersection (right of transversal — supplementary 110°)
    d.text((310, 312), shape_ar('x°'), font=FONT_BOLD, fill=BRAND)
    return save(img, 'parallel_lines_70')

# ═══════════════════════════════════════════════
# 9. Circle with inscribed angle on diameter (Thales)
# ═══════════════════════════════════════════════
def fig_circle_inscribed():
    img, d = base_canvas()
    cx, cy = 360, 210
    r = 130
    d.ellipse([(cx-r, cy-r), (cx+r, cy+r)], outline=INK, width=3)
    # diameter horizontal
    d.line([(cx-r, cy), (cx+r, cy)], fill=INK, width=2)
    # vertex on circle at top
    vx, vy = cx, cy - r
    d.line([(cx-r, cy), (vx, vy)], fill=INK, width=3)
    d.line([(vx, vy), (cx+r, cy)], fill=INK, width=3)
    # mark inscribed angle
    d.text((vx-12, vy+5), shape_ar('x°'), font=FONT_BOLD, fill=BRAND)
    # center
    d.ellipse([(cx-3, cy-3), (cx+3, cy+3)], fill=INK)
    d.text((cx+8, cy+5), 'M', font=FONT_BOLD, fill=INK)
    return save(img, 'circle_inscribed')

# ═══════════════════════════════════════════════
# 10. Food web — 4 levels (plant → rodents → mid → top)
# ═══════════════════════════════════════════════
def fig_food_web():
    img, d = base_canvas(800, 500, color=True)
    # 4 boxes left to right
    boxes = [
        (40, 200, 'النباتات', (34, 197, 94)),    # green
        (240, 200, 'القوارض', (245, 158, 11)),   # gold
        (440, 200, 'لواحم متوسطة', (239, 68, 68)),  # red
        (640, 200, 'لواحم عليا', (109, 93, 246)),   # purple
    ]
    for x, y, label, color in boxes:
        d.rounded_rectangle([(x, y), (x+140, y+80)], radius=10, fill=color, outline=INK, width=2)
        txt = shape_ar(label)
        bbox = d.textbbox((0,0), txt, font=FONT_BOLD)
        tw = bbox[2] - bbox[0]
        d.text((x + (140-tw)//2, y + 26), txt, font=FONT_BOLD, fill=WHITE)
    # arrows
    for x, _, _, _ in boxes[:-1]:
        ax = x + 140 + 5
        bx = x + 200 - 5
        ay = 240
        d.line([(ax, ay), (bx, ay)], fill=INK, width=3)
        d.polygon([(bx, ay), (bx-12, ay-6), (bx-12, ay+6)], fill=INK)
    return save(img, 'food_web')

# ═══════════════════════════════════════════════
# 11. DNA double helix (Thursday bio)
# ═══════════════════════════════════════════════
def fig_dna_helix():
    img, d = base_canvas(600, 600, color=True)
    cx = 300
    # two helical strands + rungs
    for y in range(60, 540, 5):
        t = y / 40
        offset = math.sin(t) * 70
        # left strand point
        x1 = cx - offset
        # right strand point
        x2 = cx + offset
        # color: alternating bands
        col1 = (220, 38, 38) if (y // 30) % 2 == 0 else (37, 99, 235)
        col2 = (16, 185, 129) if (y // 30) % 2 == 0 else (245, 158, 11)
        d.ellipse([(x1-3, y-3), (x1+3, y+3)], fill=col1)
        d.ellipse([(x2-3, y-3), (x2+3, y+3)], fill=col2)
        # rungs every 30 px
        if y % 30 == 0:
            rung_col = (109, 93, 246)
            d.line([(x1, y), (x2, y)], fill=rung_col, width=2)
    # caption
    txt = shape_ar('السلّم الحلزوني المزدوج (DNA)')
    bbox = d.textbbox((0,0), txt, font=FONT_BOLD)
    tw = bbox[2] - bbox[0]
    d.text(((600-tw)//2, 555), txt, font=FONT_BOLD, fill=INK)
    return save(img, 'dna_helix')

# ═══════════════════════════════════════════════
# 12. Two congruent triangles (Thursday math)
# ═══════════════════════════════════════════════
def fig_two_triangles():
    img, d = base_canvas()
    # triangle 1 (left)
    t1 = [(100, 330), (280, 330), (190, 130)]
    # triangle 2 (right) — flipped/congruent
    t2 = [(440, 330), (620, 330), (530, 130)]
    for tri in [t1, t2]:
        d.line([tri[0], tri[1]], fill=INK, width=3)
        d.line([tri[1], tri[2]], fill=INK, width=3)
        d.line([tri[2], tri[0]], fill=INK, width=3)
    # mark equal sides with hash marks (SSS visualization)
    # base
    for tri, x_off in [(t1, 0), (t2, 0)]:
        mid_b = ((tri[0][0]+tri[1][0])//2, tri[0][1])
        d.line([(mid_b[0]-7, mid_b[1]-8), (mid_b[0]-7, mid_b[1]+8)], fill=INK, width=2)
        d.line([(mid_b[0]+7, mid_b[1]-8), (mid_b[0]+7, mid_b[1]+8)], fill=INK, width=2)
    # labels
    d.text((180, 90), shape_ar('△ ABC'), font=FONT_BOLD, fill=BRAND)
    d.text((520, 90), shape_ar('△ DEF'), font=FONT_BOLD, fill=BRAND)
    txt = shape_ar('مثلثان متطابقان')
    bbox = d.textbbox((0,0), txt, font=FONT_SMALL)
    tw = bbox[2] - bbox[0]
    d.text(((720-tw)//2, 380), txt, font=FONT_SMALL, fill=INK)
    return save(img, 'two_triangles')

# ═══════════════════════════════════════════════
# 13. Broken electric circuit (Thursday physics)
# ═══════════════════════════════════════════════
def fig_broken_circuit():
    img, d = base_canvas()
    # battery on left
    bx, by = 120, 200
    d.line([(bx, by-20), (bx, by+20)], fill=INK, width=4)  # short = -
    d.line([(bx+12, by-30), (bx+12, by+30)], fill=INK, width=4)  # long = +
    d.text((bx-26, by-10), '−', font=FONT_BOLD, fill=INK)
    d.text((bx+22, by-10), '+', font=FONT_BOLD, fill=INK)
    # wire going up + right + down
    d.line([(bx, by-20), (bx, 80), (600, 80), (600, 320), (bx+12, 320), (bx+12, by+20)], fill=INK, width=3)
    # gap in the middle (the plastic section "X")
    # break the wire on right side between y=150 and y=250
    d.line([(600, 80), (600, 150)], fill=WHITE, width=5)  # erase
    d.line([(600, 150), (600, 250)], fill=WHITE, width=5)  # erase
    d.line([(600, 250), (600, 320)], fill=WHITE, width=5)  # erase
    # redraw without break
    d.line([(600, 80), (600, 150)], fill=INK, width=3)
    d.line([(600, 250), (600, 320)], fill=INK, width=3)
    # plastic block "X" with label
    d.rounded_rectangle([(580, 150), (620, 250)], radius=6, fill=(254, 226, 226), outline=(220, 38, 38), width=2)
    d.text((595, 190), 'X', font=FONT_BOLD, fill=(185, 28, 28))
    # bulb (lamp) — none lit, drawn as empty circle near top
    lx, ly = 340, 80
    d.ellipse([(lx-22, ly-22), (lx+22, ly+22)], outline=INK, width=3, fill=WHITE)
    # X mark over bulb (off)
    d.line([(lx-12, ly-12), (lx+12, ly+12)], fill=(220, 38, 38), width=3)
    d.line([(lx-12, ly+12), (lx+12, ly-12)], fill=(220, 38, 38), width=3)
    # caption
    txt = shape_ar('الجزء X (مادة عازلة) يقطع الدائرة')
    bbox = d.textbbox((0,0), txt, font=FONT_SMALL)
    tw = bbox[2] - bbox[0]
    d.text(((720-tw)//2, 370), txt, font=FONT_SMALL, fill=INK)
    return save(img, 'broken_circuit')

# Build all
figs = [
    ('asymptote_x0', fig_asymptote_x0),
    ('parabola_y_x2', fig_parabola_y_x2),
    ('jump_discontinuity', fig_jump_discontinuity),
    ('vertical_angles', fig_vertical_angles),
    ('parallel_lines_3x_20', fig_parallel_lines_3x_20),
    ('isosceles_triangle', fig_isosceles_triangle),
    ('isosceles_trapezoid', fig_isosceles_trapezoid),
    ('parallel_lines_70', fig_parallel_70),
    ('circle_inscribed', fig_circle_inscribed),
    ('food_web', fig_food_web),
    ('dna_helix', fig_dna_helix),
    ('two_triangles', fig_two_triangles),
    ('broken_circuit', fig_broken_circuit),
]
for name, fn in figs:
    out = fn()
    print(f'✓ {name}: {out}')
print(f'\nBuilt {len(figs)} figures.')
