#!/bin/bash

# ==========================================
# خوارز — تحديث الشعار لكل الصفحات
# الشعار الجديد: B (خطين جانبيين)
# ==========================================

echo "🔄 بدأ التحديث..."

# --- Step 1: Remove old CSS and add new CSS ---
OLD_CSS='\/\* Khawariz Logo \*\/.*\.kh-logo-en\{[^}]*\}'

NEW_CSS='/* Khawariz Logo - B */\
.kh-logo{font-family:Cairo,sans-serif;display:inline-block}\
.kh-logo .kh-ar{font-weight:900;color:white}\
.kh-logo .kh-kha{font-weight:900;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}\
.kh-logo .kh-en-wrap{display:flex;align-items:center;justify-content:center;gap:6px}\
.kh-logo .kh-en-line{height:1px;width:16px;border-radius:2px}\
.kh-logo .kh-en-line-r{background:linear-gradient(90deg,transparent,rgba(99,102,241,0.45))}\
.kh-logo .kh-en-line-l{background:linear-gradient(90deg,rgba(99,102,241,0.45),transparent)}\
.kh-logo .kh-en{font-family:Tajawal,sans-serif;letter-spacing:3.5px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700}'

# New logo HTML for navigation (small)
NAV_LOGO='<div class="kh-logo"><span class="kh-kha" style="font-size:24px">خـ<\/span><span class="kh-ar" style="font-size:24px">ـوارز<\/span><div class="kh-en-wrap" style="margin-top:0px"><div class="kh-en-line kh-en-line-r"><\/div><span class="kh-en" style="font-size:7px">KHAWARIZ<\/span><div class="kh-en-line kh-en-line-l"><\/div><\/div><\/div>'

# New logo HTML for hero/login pages (big)
BIG_LOGO='<div class="kh-logo"><span class="kh-kha" style="font-size:36px">خـ<\/span><span class="kh-ar" style="font-size:36px">ـوارز<\/span><div class="kh-en-wrap" style="margin-top:2px"><div class="kh-en-line kh-en-line-r" style="width:20px;height:1.5px"><\/div><span class="kh-en" style="font-size:9px;letter-spacing:5px">KHAWARIZ<\/span><div class="kh-en-line kh-en-line-l" style="width:20px;height:1.5px"><\/div><\/div><\/div>'

# Footer logo (small)
FOOT_LOGO='<div class="kh-logo"><span class="kh-kha" style="font-size:20px">خـ<\/span><span class="kh-ar" style="font-size:20px">ـوارز<\/span><div class="kh-en-wrap" style="margin-top:1px"><div class="kh-en-line kh-en-line-r" style="width:10px"><\/div><span class="kh-en" style="font-size:6px;letter-spacing:3px">KHAWARIZ<\/span><div class="kh-en-line kh-en-line-l" style="width:10px"><\/div><\/div><\/div>'

# Old logo HTML patterns to replace
OLD_NAV='<div class="kh-logo-box"><div class="kh-corner-tl"><\/div><div class="kh-corner-br"><\/div><div class="kh-logo-name"><span class="kha">خـ<\/span>ـوارز<\/div><div class="kh-logo-line"><\/div><div class="kh-logo-en">KHAWARIZ<\/div><\/div>'

# Process all HTML files
for file in *.html; do
    if [ -f "$file" ]; then
        # Skip files that already have new logo
        if grep -q "kh-en-wrap" "$file"; then
            echo "⏭️  $file — already updated"
            continue
        fi

        # 1. Replace old CSS block with new CSS
        # First try removing old CSS classes
        sed -i '' 's/\/\* Khawariz Logo \*\//\/\* Khawariz Logo - B \*\//' "$file"
        sed -i '' 's/\.kh-logo-box{[^}]*}/.kh-logo{font-family:Cairo,sans-serif;display:inline-block}/' "$file"
        sed -i '' 's/\.kh-corner-tl,\.kh-corner-br{[^}]*}/.kh-logo .kh-ar{font-weight:900;color:white}/' "$file"
        sed -i '' 's/\.kh-corner-tl{[^}]*}/.kh-logo .kh-kha{font-weight:900;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}/' "$file"
        sed -i '' 's/\.kh-corner-br{[^}]*}/.kh-logo .kh-en-wrap{display:flex;align-items:center;justify-content:center;gap:6px}/' "$file"
        sed -i '' 's/\.kh-logo-name{[^}]*}/.kh-logo .kh-en-line{height:1px;width:16px;border-radius:2px}/' "$file"
        sed -i '' 's/\.kh-logo-name \.kha{[^}]*}/.kh-logo .kh-en-line-r{background:linear-gradient(90deg,transparent,rgba(99,102,241,0.45))}/' "$file"
        sed -i '' 's/\.kh-logo-line{[^}]*}/.kh-logo .kh-en-line-l{background:linear-gradient(90deg,rgba(99,102,241,0.45),transparent)}/' "$file"
        sed -i '' "s/\.kh-logo-en{[^}]*}/.kh-logo .kh-en{font-family:Tajawal,sans-serif;letter-spacing:3.5px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700}/" "$file"

        # 2. Replace old logo HTML with new
        # Navigation logo
        sed -i '' "s/<div class=\"kh-logo-box\"><div class=\"kh-corner-tl\"><\/div><div class=\"kh-corner-br\"><\/div><div class=\"kh-logo-name\"><span class=\"kha\">خـ<\/span>ـوارز<\/div><div class=\"kh-logo-line\"><\/div><div class=\"kh-logo-en\">KHAWARIZ<\/div><\/div>/${NAV_LOGO}/g" "$file"

        # Footer logo (with inline styles for smaller size)
        sed -i '' "s/<div class=\"kh-logo-box\" style=\"padding:5px 16px 4px\">.*<\/div><\/div><\/div><\/div><\/div>/${FOOT_LOGO}/g" "$file"

        # Also handle footer with kh-logo-name style
        sed -i '' "s/<div class=\"kh-logo-name\" style=\"font-size:15px\"><span class=\"kha\">خـ<\/span>ـوارز<\/div>/${FOOT_LOGO}/g" "$file"

        # Add Cairo font if not present
        if ! grep -q "family=Cairo" "$file"; then
            sed -i '' 's|family=Tajawal|family=Cairo:wght@700;900\&family=Tajawal|' "$file"
        fi

        echo "✅ $file — updated!"
    fi
done

echo ""
echo "✅ Done! Now run:"
echo "git add . && git commit -m 'new clean logo B' && git push"
