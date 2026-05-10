#!/bin/bash
echo "🔄 Fixing all logos..."

# ============================
# LOGO HTML TEMPLATES
# ============================

# Nav logo (24px)
NAV='<div class="kh-logo"><span class="kh-kha" style="font-size:24px">خـ<\/span><span class="kh-ar" style="font-size:24px">ـوارز<\/span><div class="kh-en-wrap" style="margin-top:0px"><div class="kh-en-line kh-en-line-r"><\/div><span class="kh-en" style="font-size:7px">KHAWARIZ<\/span><div class="kh-en-line kh-en-line-l"><\/div><\/div><\/div>'

# Big logo (36px) - for login, register, hero
BIG='<div class="kh-logo"><span class="kh-kha" style="font-size:36px">خـ<\/span><span class="kh-ar" style="font-size:36px">ـوارز<\/span><div class="kh-en-wrap" style="margin-top:2px"><div class="kh-en-line kh-en-line-r" style="width:20px;height:1.5px"><\/div><span class="kh-en" style="font-size:9px;letter-spacing:5px">KHAWARIZ<\/span><div class="kh-en-line kh-en-line-l" style="width:20px;height:1.5px"><\/div><\/div><\/div>'

# Footer logo (20px)
FOOT='<div class="kh-logo"><span class="kh-kha" style="font-size:20px">خـ<\/span><span class="kh-ar" style="font-size:20px">ـوارز<\/span><div class="kh-en-wrap" style="margin-top:1px"><div class="kh-en-line kh-en-line-r" style="width:10px"><\/div><span class="kh-en" style="font-size:6px;letter-spacing:3px">KHAWARIZ<\/span><div class="kh-en-line kh-en-line-l" style="width:10px"><\/div><\/div><\/div>'

# CSS block
read -r -d '' NEWCSS << 'CSSEOF'
/* Khawariz Logo - B */
.kh-logo{font-family:'Cairo',sans-serif;display:inline-block;text-align:center}
.kh-logo .kh-ar{font-weight:900;color:white}
.kh-logo .kh-kha{font-weight:900;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.kh-logo .kh-en-wrap{display:flex;align-items:center;justify-content:center;gap:6px}
.kh-logo .kh-en-line{height:1px;width:16px;border-radius:2px}
.kh-logo .kh-en-line-r{background:linear-gradient(90deg,transparent,rgba(99,102,241,0.45))}
.kh-logo .kh-en-line-l{background:linear-gradient(90deg,rgba(99,102,241,0.45),transparent)}
.kh-logo .kh-en{font-family:'Tajawal',sans-serif;letter-spacing:3.5px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700}
CSSEOF

# ============================
# FIX EACH FILE SPECIFICALLY
# ============================

# --- LOGIN.HTML ---
# Change small logo to big logo
if [ -f "login.html" ]; then
    # Replace nav-sized logo with big logo
    sed -i '' 's|<div class="kh-logo"><span class="kh-kha" style="font-size:24px">خـ</span><span class="kh-ar" style="font-size:24px">ـوارز</span><div class="kh-en-wrap" style="margin-top:0px"><div class="kh-en-line kh-en-line-r"></div><span class="kh-en" style="font-size:7px">KHAWARIZ</span><div class="kh-en-line kh-en-line-l"></div></div></div>|'"${BIG}"'|g' login.html
    echo "✅ login.html"
fi

# --- REGISTER.HTML ---
if [ -f "register.html" ]; then
    sed -i '' 's|<div class="kh-logo"><span class="kh-kha" style="font-size:24px">خـ</span><span class="kh-ar" style="font-size:24px">ـوارز</span><div class="kh-en-wrap" style="margin-top:0px"><div class="kh-en-line kh-en-line-r"></div><span class="kh-en" style="font-size:7px">KHAWARIZ</span><div class="kh-en-line kh-en-line-l"></div></div></div>|'"${BIG}"'|g' register.html
    echo "✅ register.html"
fi

# --- PRICING.HTML ---
# This one has duplicate logos - need to check
if [ -f "pricing.html" ]; then
    # First remove any old gradient text logo that's doubled
    sed -i '' 's|<span class="text-xl font-black bg-gradient-to-l from-purple-300 to-indigo-300 bg-clip-text text-transparent">خوارز</span>||g' pricing.html
    sed -i '' 's|<span class="block text-\[9px\] text-purple-200/70 font-medium -mt-1">القدرات · التحصيلي · قياس</span>||g' pricing.html
    echo "✅ pricing.html"
fi

# --- PRIVACY.HTML & TERMS.HTML & SUBSCRIPTION-POLICY.HTML ---
# These have simple gradient text logos
for f in privacy.html terms.html subscription-policy.html; do
    if [ -f "$f" ]; then
        # Replace gradient text logo
        sed -i '' 's|<a href="index.html" class="text-2xl font-black bg-gradient-to-l from-purple-300 to-indigo-300 bg-clip-text text-transparent">خوارز</a>|<a href="index.html">'"${NAV}"'</a>|g' "$f"
        sed -i '' 's|<a href="index.html" class="text-xl font-black bg-gradient-to-l from-purple-300 to-indigo-300 bg-clip-text text-transparent hover:from-purple-200 hover:to-indigo-200 transition-all">خوارز</a>|<a href="index.html">'"${NAV}"'</a>|g' "$f"
        
        # Add CSS if missing
        if ! grep -q "kh-logo{" "$f"; then
            sed -i '' "s|</style>|${NEWCSS}\n</style>|" "$f"
        fi
        
        # Add Cairo font if missing
        if ! grep -q "family=Cairo" "$f"; then
            sed -i '' 's|family=Tajawal|family=Cairo:wght@700;900\&family=Tajawal|' "$f"
        fi
        
        echo "✅ $f"
    fi
done

# --- SELECT-SECTION.HTML (Dashboard) ---
if [ -f "select-section.html" ]; then
    # Has old 🎓 emoji + gradient text
    sed -i '' 's|<span class="text-2xl sm:text-3xl">🎓</span>||g' select-section.html
    sed -i '' 's|<div class="text-xl sm:text-2xl font-black bg-gradient-to-l from-purple-300 to-indigo-300 bg-clip-text text-transparent">خوارز</div>|'"${NAV}"'|g' select-section.html
    sed -i '' 's|<div class="text-\[8px\] text-purple-200/70 font-medium">القدرات · التحصيلي · قياس</div>||g' select-section.html
    echo "✅ select-section.html"
fi

# --- DASHBOARD.HTML ---
if [ -f "dashboard.html" ]; then
    sed -i '' 's|<span class="text-2xl sm:text-3xl">🎓</span>||g' dashboard.html
    sed -i '' 's|<div class="text-xl sm:text-2xl font-black bg-gradient-to-l from-purple-300 to-indigo-300 bg-clip-text text-transparent">خوارز</div>|'"${NAV}"'|g' dashboard.html
    sed -i '' 's|<div class="text-\[8px\] text-purple-200/70 font-medium">القدرات · التحصيلي · قياس</div>||g' dashboard.html
    echo "✅ dashboard.html"
fi

# --- CONTACT.HTML ---
if [ -f "contact.html" ]; then
    sed -i '' 's|<a href="index.html" class="text-2xl font-black bg-gradient-to-l from-purple-300 to-indigo-300 bg-clip-text text-transparent">خوارز</a>|<a href="index.html">'"${NAV}"'</a>|g' contact.html
    if ! grep -q "kh-logo{" contact.html; then
        sed -i '' "s|</style>|${NEWCSS}\n</style>|" contact.html
    fi
    if ! grep -q "family=Cairo" contact.html; then
        sed -i '' 's|family=Tajawal|family=Cairo:wght@700;900\&family=Tajawal|' contact.html
    fi
    echo "✅ contact.html"
fi

# --- ALL FILES: Fix footer old logo pattern ---
for f in *.html; do
    if [ -f "$f" ]; then
        # Replace old footer logo text
        sed -i '' 's|<div class="kh-logo-name" style="font-size:15px"><span class="kha">خـ</span>ـوارز</div>|'"${FOOT}"'|g' "$f"
        
        # Remove any leftover "القدرات · التحصيلي · قياس" subtitle near logo
        sed -i '' 's|<span class="block text-\[9px\] text-purple-200/70 font-medium -mt-1">القدرات · التحصيلي · قياس</span>||g' "$f"
    fi
done

echo ""
echo "✅ All done! Run:"
echo "git add . && git commit -m 'fix all logos final' && git push"
