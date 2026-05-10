#!/bin/bash
# Script to update Khawariz logo in all HTML files

CSS_CODE='/* Khawariz Logo */\n.kh-logo-box{position:relative;display:inline-flex;flex-direction:column;align-items:center;padding:7px 22px 6px;border:1.5px solid rgba(139,92,246,0.25);border-radius:6px;background:rgba(15,10,46,0.3)}\n.kh-corner-tl,.kh-corner-br{position:absolute;width:8px;height:8px}\n.kh-corner-tl{top:-1.5px;left:-1.5px;border-top:2px solid #a855f7;border-left:2px solid #a855f7;border-radius:2px 0 0 0}\n.kh-corner-br{bottom:-1.5px;right:-1.5px;border-bottom:2px solid #a855f7;border-right:2px solid #a855f7;border-radius:0 0 2px 0}\n.kh-logo-name{font-size:18px;font-weight:900;line-height:1;color:white}\n.kh-logo-name .kha{background:linear-gradient(135deg,#c084fc,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n.kh-logo-line{height:1.5px;margin-top:3px;width:100%;background:linear-gradient(90deg,#7c3aed,#a855f7,rgba(168,85,247,0.2));border-radius:1px}\n.kh-logo-en{font-size:7px;letter-spacing:2.5px;color:rgba(168,85,247,0.45);font-weight:700;margin-top:2px}'

LOGO_HTML='<div class="kh-logo-box"><div class="kh-corner-tl"><\/div><div class="kh-corner-br"><\/div><div class="kh-logo-name"><span class="kha">خـ<\/span>ـوارز<\/div><div class="kh-logo-line"><\/div><div class="kh-logo-en">KHAWARIZ<\/div><\/div>'

for file in login.html register.html practice.html results.html mistakes.html profile.html stats.html select-section.html pricing.html dashboard.html contact.html privacy.html terms.html subscription-policy.html admin.html admin-login.html admin-users.html coming-soon.html coming-soon-main.html; do
    if [ -f "$file" ]; then
        # Add CSS before </style> if not already there
        if ! grep -q "kh-logo-box" "$file"; then
            sed -i '' "s|</style>|${CSS_CODE}\n</style>|" "$file"
        fi
        
        # Replace all emoji logo variations
        sed -i '' "s|<span class=\"text-2xl\">🎓</span>|${LOGO_HTML}|g" "$file"
        sed -i '' "s|<span class=\"text-4xl block mb-2\">🎓</span>|${LOGO_HTML}|g" "$file"
        sed -i '' "s|<div class=\"logo-icon inline-block text-6xl mb-4\">🎓</div>|${LOGO_HTML}|g" "$file"
        sed -i '' "s|<span class=\"text-xl\">🎓</span>|${LOGO_HTML}|g" "$file"
        sed -i '' "s|<span class=\"text-3xl\">🎓</span>|${LOGO_HTML}|g" "$file"
        
        # Replace footer logo
        sed -i '' "s|<span class=\"font-black text-lg bg-gradient-to-l from-purple-300 to-indigo-300 bg-clip-text text-transparent\">خوارز</span>|<div class=\"kh-logo-name\" style=\"font-size:15px\"><span class=\"kha\">خـ</span>ـوارز</div>|g" "$file"
        
        echo "Updated: $file"
    fi
done

echo "Done! Now run: git add . && git commit -m 'update logo all pages' && git push"
