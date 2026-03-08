/**
 * gamification.js — محرك Streaks + Badges + XP لمدارك النخبة
 * يُحمّل في: dashboard, results, profile, practice
 */
(function(){
    'use strict';

    var RIYADH_TZ = 'Asia/Riyadh';
    var STORAGE_STREAK = 'madarek_streak_cache';
    var STORAGE_BADGES = 'madarek_badges_cache';
    var STORAGE_FREEZE = 'madarek_streak_freeze';
    var STORAGE_MAX_CONSEC = 'madarek_max_consecutive';

    // ══════════════════════════════════════
    //  تعريف البادجات
    // ══════════════════════════════════════
    var BADGES = [
        {
            id: 'sniper',
            emoji: '\uD83C\uDFAF',
            nameAr: '\u0642\u0646\u0651\u0627\u0635',
            descAr: '10 \u0625\u062C\u0627\u0628\u0627\u062A \u0635\u062D\u064A\u062D\u0629 \u0645\u062A\u062A\u0627\u0644\u064A\u0629',
            threshold: 10,
            check: function(data){ return data.maxConsecutive >= 10; }
        },
        {
            id: 'fire',
            emoji: '\uD83D\uDD25',
            nameAr: '\u0645\u0634\u062A\u0639\u0644',
            descAr: '\u0633\u0644\u0633\u0644\u0629 7 \u0623\u064A\u0627\u0645 \u0645\u062A\u0648\u0627\u0635\u0644\u0629',
            threshold: 7,
            check: function(data){ return data.streak.longest >= 7; }
        },
        {
            id: 'genius',
            emoji: '\uD83E\uDDE0',
            nameAr: '\u0639\u0628\u0642\u0631\u064A',
            descAr: '\u0646\u0633\u0628\u0629 \u0625\u0635\u0627\u0628\u0629 +90% (100+ \u0633\u0624\u0627\u0644)',
            threshold: 90,
            check: function(data){ return data.total >= 100 && data.accuracy >= 90; }
        },
        {
            id: 'lightning',
            emoji: '\u26A1',
            nameAr: '\u0627\u0644\u0628\u0631\u0642',
            descAr: '50 \u0633\u0624\u0627\u0644 \u0641\u064A \u062C\u0644\u0633\u0629 \u0648\u0627\u062D\u062F\u0629',
            threshold: 50,
            check: function(data){ return data.maxSessionQuestions >= 50; }
        },
        {
            id: 'centurion',
            emoji: '\uD83D\uDCAF',
            nameAr: '\u0627\u0644\u0645\u0626\u0648\u064A',
            descAr: '\u062D\u0644 100 \u0633\u0624\u0627\u0644',
            threshold: 100,
            check: function(data){ return data.total >= 100; }
        },
        {
            id: 'warrior',
            emoji: '\u2694\uFE0F',
            nameAr: '\u0627\u0644\u0645\u062D\u0627\u0631\u0628',
            descAr: '\u062D\u0644 500 \u0633\u0624\u0627\u0644',
            threshold: 500,
            check: function(data){ return data.total >= 500; }
        },
        {
            id: 'elite',
            emoji: '\uD83D\uDC51',
            nameAr: '\u0627\u0644\u0646\u062E\u0628\u0629',
            descAr: '\u0633\u0644\u0633\u0644\u0629 30 \u064A\u0648\u0645 \u0645\u062A\u0648\u0627\u0635\u0644',
            threshold: 30,
            check: function(data){ return data.streak.longest >= 30; }
        },
        {
            id: 'legend',
            emoji: '\uD83C\uDFC6',
            nameAr: '\u0623\u0633\u0637\u0648\u0631\u0629',
            descAr: '\u0633\u0644\u0633\u0644\u0629 100 \u064A\u0648\u0645 \u0645\u062A\u0648\u0627\u0635\u0644',
            threshold: 100,
            check: function(data){ return data.streak.longest >= 100; }
        },
        // ══ شارات جديدة ══
        {
            id: 'first_step',
            emoji: '👣',
            nameAr: 'الخطوة الأولى',
            descAr: 'حل أول 10 أسئلة',
            threshold: 10,
            check: function(data){ return data.total >= 10; }
        },
        {
            id: 'perfectionist',
            emoji: '✨',
            nameAr: 'بلا أخطاء',
            descAr: '20 إجابة صحيحة متتالية',
            threshold: 20,
            check: function(data){ return data.maxConsecutive >= 20; }
        },
        {
            id: 'allrounder',
            emoji: '🎪',
            nameAr: 'شامل',
            descAr: 'تدرّب في كل الأقسام',
            threshold: 3,
            check: function(data){ return data.sectionsAttempted >= 3; }
        },
        {
            id: 'weekly_hero',
            emoji: '📅',
            nameAr: 'بطل الأسبوع',
            descAr: 'حقق الهدف الأسبوعي (50 سؤال)',
            threshold: 50,
            check: function(data){ return data.weeklyTotal >= 50; }
        },
        {
            id: 'thousand',
            emoji: '🏅',
            nameAr: 'الألف',
            descAr: 'حل 1000 سؤال',
            threshold: 1000,
            check: function(data){ return data.total >= 1000; }
        },
        {
            id: 'improver',
            emoji: '📈',
            nameAr: 'المتطور',
            descAr: 'رفع النسبة 10%+ عن آخر 50 سؤال',
            threshold: 10,
            check: function(data){ return data.improvementPercent >= 10; }
        }
    ];

    // ══════════════════════════════════════
    //  نظام المستويات
    // ══════════════════════════════════════
    var LEVELS = [
        { level: 1, nameAr: 'مبتدئ',  emoji: '🌱', minXP: 0,     maxXP: 500,   color: '#94a3b8' },
        { level: 2, nameAr: 'متعلم',  emoji: '📘', minXP: 500,   maxXP: 1500,  color: '#60a5fa' },
        { level: 3, nameAr: 'متدرب',  emoji: '⚡', minXP: 1500,  maxXP: 3500,  color: '#a78bfa' },
        { level: 4, nameAr: 'متمكن',  emoji: '🔥', minXP: 3500,  maxXP: 7000,  color: '#fb923c' },
        { level: 5, nameAr: 'متفوق',  emoji: '💎', minXP: 7000,  maxXP: 12000, color: '#2dd4bf' },
        { level: 6, nameAr: 'خبير',   emoji: '🧠', minXP: 12000, maxXP: 20000, color: '#f472b6' },
        { level: 7, nameAr: 'أسطورة', emoji: '🏆', minXP: 20000, maxXP: 35000, color: '#fbbf24' },
        { level: 8, nameAr: 'النخبة', emoji: '👑', minXP: 35000, maxXP: 999999, color: '#e879f9' }
    ];

    function calculateLevel(totalXP){
        var lvl = LEVELS[0];
        for(var i = LEVELS.length - 1; i >= 0; i--){
            if(totalXP >= LEVELS[i].minXP){
                lvl = LEVELS[i];
                break;
            }
        }
        var progress = 0;
        var xpInLevel = totalXP - lvl.minXP;
        var xpNeeded = lvl.maxXP - lvl.minXP;
        if(xpNeeded > 0) progress = Math.min(Math.round((xpInLevel / xpNeeded) * 100), 100);
        return {
            level: lvl.level,
            nameAr: lvl.nameAr,
            emoji: lvl.emoji,
            color: lvl.color,
            minXP: lvl.minXP,
            maxXP: lvl.maxXP,
            currentXP: totalXP,
            xpInLevel: xpInLevel,
            xpNeeded: xpNeeded,
            progress: progress,
            isMax: lvl.level === 8
        };
    }

    // ══════════════════════════════════════
    //  التحديات اليومية
    // ══════════════════════════════════════
    var CHALLENGE_TEMPLATES = [
        { id: 'solve_10',    textAr: 'حل 10 أسئلة اليوم',             targetKey: 'todayTotal',   target: 10,  xp: 50,  emoji: '🎯' },
        { id: 'solve_20',    textAr: 'حل 20 سؤال اليوم',              targetKey: 'todayTotal',   target: 20,  xp: 80,  emoji: '🚀' },
        { id: 'accuracy_70', textAr: 'حقق 70% في جلسة اليوم',         targetKey: 'todayAccuracy', target: 70, xp: 60,  emoji: '🎯' },
        { id: 'accuracy_80', textAr: 'حقق 80% في جلسة اليوم',         targetKey: 'todayAccuracy', target: 80, xp: 100, emoji: '💎' },
        { id: 'streak_3',    textAr: 'حافظ على سلسلة 3 صحيحة متتالية', targetKey: 'sessionConsecutive', target: 3, xp: 30, emoji: '⚡' },
        { id: 'streak_5',    textAr: '5 إجابات صحيحة متتالية',         targetKey: 'sessionConsecutive', target: 5, xp: 50, emoji: '🔥' },
        { id: 'review_5',    textAr: 'راجع 5 أخطاء سابقة',             targetKey: 'reviewedMistakes',  target: 5, xp: 40, emoji: '📖' },
        { id: 'quant_5',     textAr: 'حل 5 أسئلة كمي',                 targetKey: 'todayQuant',   target: 5,   xp: 40,  emoji: '🔢' },
        { id: 'verbal_5',    textAr: 'حل 5 أسئلة لفظي',                targetKey: 'todayVerbal',  target: 5,   xp: 40,  emoji: '📝' },
        { id: 'fast_10',     textAr: 'أجب 10 أسئلة بدون توقف',         targetKey: 'todayTotal',   target: 10,  xp: 60,  emoji: '⏱️' }
    ];

    var STORAGE_CHALLENGE = 'madarek_daily_challenge';

    function getDailyChallenge(){
        // تحدي يتغير يومياً (حسب يوم السنة)
        var today = getTodayRiyadh();
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(STORAGE_CHALLENGE) || '{}'); } catch(e){}
        if(cached && cached.date === today) return cached;

        // اختيار تحدي عشوائي ثابت لليوم
        var dayOfYear = Math.floor((new Date(today) - new Date(today.split('-')[0] + '-01-01')) / 86400000);
        var idx = dayOfYear % CHALLENGE_TEMPLATES.length;
        var tmpl = CHALLENGE_TEMPLATES[idx];

        var challenge = {
            date: today,
            id: tmpl.id,
            textAr: tmpl.textAr,
            targetKey: tmpl.targetKey,
            target: tmpl.target,
            xp: tmpl.xp,
            emoji: tmpl.emoji,
            progress: 0,
            completed: false
        };
        localStorage.setItem(STORAGE_CHALLENGE, JSON.stringify(challenge));
        return challenge;
    }

    function updateDailyChallenge(key, value){
        var ch = getDailyChallenge();
        if(ch.completed) return ch;
        if(key === ch.targetKey){
            ch.progress = Math.min(value, ch.target);
            if(ch.progress >= ch.target) ch.completed = true;
            localStorage.setItem(STORAGE_CHALLENGE, JSON.stringify(ch));
        }
        return ch;
    }

    // ══════════════════════════════════════
    //  مكافآت السلسلة المتدرجة
    // ══════════════════════════════════════
    function getStreakBonus(currentStreak){
        if(currentStreak >= 30) return 15;
        if(currentStreak >= 14) return 12;
        if(currentStreak >= 7)  return 8;
        if(currentStreak >= 3)  return 5;
        return 0;
    }

    function getStreakTierAr(currentStreak){
        if(currentStreak >= 30) return '🔥 مشتعل!';
        if(currentStreak >= 14) return '💎 ثابت';
        if(currentStreak >= 7)  return '⚡ متواصل';
        if(currentStreak >= 3)  return '🌱 بداية قوية';
        return '';
    }

    // ══════════════════════════════════════
    //  مساعدات التاريخ (بتوقيت الرياض)
    // ══════════════════════════════════════
    function toRiyadhDate(dateStr){
        var d = new Date(dateStr);
        return new Intl.DateTimeFormat('en-CA', {timeZone: RIYADH_TZ}).format(d); // YYYY-MM-DD
    }

    function getTodayRiyadh(){
        return new Intl.DateTimeFormat('en-CA', {timeZone: RIYADH_TZ}).format(new Date());
    }

    function getYesterdayRiyadh(){
        var d = new Date();
        d.setDate(d.getDate() - 1);
        return new Intl.DateTimeFormat('en-CA', {timeZone: RIYADH_TZ}).format(d);
    }

    function daysBetween(dateStr1, dateStr2){
        var d1 = new Date(dateStr1 + 'T00:00:00');
        var d2 = new Date(dateStr2 + 'T00:00:00');
        return Math.round(Math.abs(d2 - d1) / 86400000);
    }

    // ══════════════════════════════════════
    //  حساب الـ Streak
    // ══════════════════════════════════════
    function calculateStreak(attempts){
        if(!attempts || !attempts.length){
            return {current: 0, longest: 0, practicedToday: false, daysSinceLastPractice: -1};
        }

        // استخراج الأيام الفريدة اللي فيها إجابة صحيحة على الأقل
        var daysSet = {};
        attempts.forEach(function(a){
            if(a.is_correct && a.answered_at){
                var day = toRiyadhDate(a.answered_at);
                daysSet[day] = true;
            }
        });

        var days = Object.keys(daysSet).sort().reverse(); // الأحدث أول
        if(!days.length){
            return {current: 0, longest: 0, practicedToday: false, daysSinceLastPractice: -1};
        }

        var today = getTodayRiyadh();
        var yesterday = getYesterdayRiyadh();
        var practicedToday = !!daysSet[today];

        // فحص درع الـ Streak
        var freezeData = getFreeze();
        var hasFreezeForYesterday = (freezeData.frozenDate === yesterday);

        // حساب الـ streak الحالي
        var current = 0;
        var startDay = practicedToday ? today : (hasFreezeForYesterday ? yesterday : null);

        if(startDay){
            var checkDate = new Date(startDay + 'T00:00:00');
            while(true){
                var checkStr = checkDate.toISOString().split('T')[0];
                if(daysSet[checkStr]){
                    current++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else if(freezeData.frozenDate === checkStr){
                    // اليوم المجمّد — نتخطاه بدون كسر السلسلة
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        // حساب أطول streak
        var longest = 0;
        var tempStreak = 0;
        var allDaysSorted = days.slice().sort(); // من الأقدم للأحدث
        for(var i = 0; i < allDaysSorted.length; i++){
            if(i === 0){
                tempStreak = 1;
            } else {
                var diff = daysBetween(allDaysSorted[i-1], allDaysSorted[i]);
                if(diff === 1){
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
            }
            if(tempStreak > longest) longest = tempStreak;
        }

        if(current > longest) longest = current;

        var daysSinceLast = practicedToday ? 0 : daysBetween(days[0], today);

        var result = {
            current: current,
            longest: longest,
            practicedToday: practicedToday,
            daysSinceLastPractice: daysSinceLast
        };

        // حفظ الكاش
        setStreakCache(result);

        return result;
    }

    // ══════════════════════════════════════
    //  حساب XP
    // ══════════════════════════════════════
    function calculateXP(attempts, currentStreak){
        var xp = 0;
        if(!attempts) return xp;
        var bonus = getStreakBonus(currentStreak);
        attempts.forEach(function(a){
            if(a.is_correct){
                xp += 10 + bonus;
            } else {
                xp += 3;
            }
        });
        return xp;
    }

    // حساب XP لجلسة واحدة فقط
    function calculateSessionXP(correct, wrong, currentStreak){
        var bonus = getStreakBonus(currentStreak);
        var correctXP = correct * (10 + bonus);
        var wrongXP = wrong * 3;
        var sessionBonus = (correct + wrong >= 10) ? 20 : 0;
        return {
            correctXP: correctXP,
            wrongXP: wrongXP,
            sessionBonus: sessionBonus,
            streakBonus: bonus > 0 ? correct * bonus : 0,
            streakTier: getStreakTierAr(currentStreak),
            total: correctXP + wrongXP + sessionBonus
        };
    }

    // ══════════════════════════════════════
    //  حساب الإجابات الصحيحة المتتالية
    // ══════════════════════════════════════
    function calculateMaxConsecutive(attempts){
        if(!attempts || !attempts.length) return 0;

        // ترتيب من الأقدم
        var sorted = attempts.slice().sort(function(a,b){
            return new Date(a.answered_at) - new Date(b.answered_at);
        });

        var max = 0, current = 0;
        sorted.forEach(function(a){
            if(a.is_correct){
                current++;
                if(current > max) max = current;
            } else {
                current = 0;
            }
        });

        // دمج مع القيمة المخزنة (ممكن تكون من جلسة سابقة)
        var stored = parseInt(localStorage.getItem(STORAGE_MAX_CONSEC) || '0', 10);
        if(max > stored){
            localStorage.setItem(STORAGE_MAX_CONSEC, max);
            return max;
        }
        return Math.max(max, stored);
    }

    // ══════════════════════════════════════
    //  حساب البادجات
    // ══════════════════════════════════════
    function calculateBadges(attempts, streakData, extraData){
        var total = attempts ? attempts.length : 0;
        var correct = 0;
        if(attempts){
            attempts.forEach(function(a){ if(a.is_correct) correct++; });
        }
        var accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        var maxConsecutive = calculateMaxConsecutive(attempts);

        // أقصى عدد أسئلة في جلسة واحدة
        var maxSession = parseInt(localStorage.getItem('madarek_max_session_questions') || '0', 10);

        // حساب الأقسام المجرّبة
        var sectionsSet = {};
        if(attempts){
            attempts.forEach(function(a){
                if(a.section) sectionsSet[a.section] = true;
                else if(a.questions && a.questions.section) sectionsSet[a.questions.section] = true;
            });
        }

        // حساب التحسن (آخر 50 مقارنة بالـ 50 قبلها)
        var improvementPercent = 0;
        if(attempts && attempts.length >= 100){
            var sorted = attempts.slice().sort(function(a,b){
                return new Date(b.answered_at) - new Date(a.answered_at);
            });
            var recent50 = sorted.slice(0, 50);
            var prev50 = sorted.slice(50, 100);
            var recentCorrect = 0, prevCorrect = 0;
            recent50.forEach(function(a){ if(a.is_correct) recentCorrect++; });
            prev50.forEach(function(a){ if(a.is_correct) prevCorrect++; });
            var recentPct = (recentCorrect / 50) * 100;
            var prevPct = (prevCorrect / 50) * 100;
            improvementPercent = Math.round(recentPct - prevPct);
        }

        // حساب أسئلة الأسبوع
        var weeklyTotal = 0;
        if(attempts){
            var now = new Date();
            var dayOfWeek = now.getDay();
            var weekStartDate = new Date(now);
            weekStartDate.setDate(now.getDate() - dayOfWeek);
            weekStartDate.setHours(0, 0, 0, 0);
            attempts.forEach(function(a){
                if(a.answered_at && new Date(a.answered_at) >= weekStartDate) weeklyTotal++;
            });
        }

        var ext = extraData || {};
        var data = {
            total: total,
            correct: correct,
            accuracy: accuracy,
            maxConsecutive: maxConsecutive,
            maxSessionQuestions: maxSession,
            streak: streakData || {current: 0, longest: 0},
            sectionsAttempted: Object.keys(sectionsSet).length,
            weeklyTotal: ext.weeklyTotal || weeklyTotal,
            improvementPercent: ext.improvementPercent || improvementPercent
        };

        var earned = [];
        var newBadges = [];
        var cachedIds = getBadgeCache();

        BADGES.forEach(function(badge){
            if(badge.check(data)){
                earned.push(badge);
                if(cachedIds.indexOf(badge.id) === -1){
                    newBadges.push(badge);
                }
            }
        });

        // تحديث الكاش
        var earnedIds = earned.map(function(b){ return b.id; });
        setBadgeCache(earnedIds);

        return {
            earned: earned,
            newBadges: newBadges,
            all: BADGES,
            data: data
        };
    }

    // ══════════════════════════════════════
    //  درع الـ Streak (تجميد)
    // ══════════════════════════════════════
    function getFreeze(){
        try{
            return JSON.parse(localStorage.getItem(STORAGE_FREEZE) || '{}');
        } catch(e){ return {}; }
    }

    function useStreakFreeze(){
        var data = getFreeze();
        var today = getTodayRiyadh();

        // تحديد بداية الأسبوع (الأحد)
        var now = new Date();
        var dayOfWeek = now.getDay(); // 0=Sunday
        var weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        var weekKey = new Intl.DateTimeFormat('en-CA', {timeZone: RIYADH_TZ}).format(weekStart);

        if(data.weekUsed === weekKey){
            return false; // مستخدم هالأسبوع
        }

        data.weekUsed = weekKey;
        data.frozenDate = today;
        localStorage.setItem(STORAGE_FREEZE, JSON.stringify(data));
        return true;
    }

    function canUseFreeze(){
        var data = getFreeze();
        var now = new Date();
        var dayOfWeek = now.getDay();
        var weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        var weekKey = new Intl.DateTimeFormat('en-CA', {timeZone: RIYADH_TZ}).format(weekStart);
        return data.weekUsed !== weekKey;
    }

    // ══════════════════════════════════════
    //  كاش localStorage
    // ══════════════════════════════════════
    function setStreakCache(data){
        try{
            data._date = getTodayRiyadh();
            localStorage.setItem(STORAGE_STREAK, JSON.stringify(data));
        } catch(e){}
    }

    function getStreakCache(){
        try{
            var d = JSON.parse(localStorage.getItem(STORAGE_STREAK) || '{}');
            if(d._date === getTodayRiyadh()) return d;
            return null;
        } catch(e){ return null; }
    }

    function setBadgeCache(earnedIds){
        try{
            localStorage.setItem(STORAGE_BADGES, JSON.stringify(earnedIds));
        } catch(e){}
    }

    function getBadgeCache(){
        try{
            return JSON.parse(localStorage.getItem(STORAGE_BADGES) || '[]');
        } catch(e){ return []; }
    }

    // ══════════════════════════════════════
    //  توليد HTML للـ Streak Widget
    // ══════════════════════════════════════
    function renderStreakWidget(streakData){
        var s = streakData;
        var statusHTML = '';
        var emoji = '\uD83D\uDD25'; // 🔥

        if(s.current === 0 && !s.practicedToday){
            emoji = '\uD83D\uDCA4'; // 💤
            statusHTML = '<span style="color:rgba(196,181,253,0.5);font-size:12px">\u0627\u0628\u062F\u0623 \u0633\u0644\u0633\u0644\u062A\u0643 \u0627\u0644\u064A\u0648\u0645!</span>';
        } else if(s.practicedToday){
            statusHTML = '<span style="color:#4ade80;font-size:12px;font-weight:700">\u062A\u062F\u0631\u0628\u062A \u0627\u0644\u064A\u0648\u0645 \u2705</span>';
        } else if(s.daysSinceLastPractice === 1){
            statusHTML = '<span style="color:#fbbf24;font-size:12px;font-weight:700">\u0644\u0627 \u062A\u0643\u0633\u0631 \u0633\u0644\u0633\u0644\u062A\u0643! \u23F0</span>';
        } else {
            emoji = '\uD83D\uDCA4';
            statusHTML = '<span style="color:rgba(196,181,253,0.5);font-size:12px">\u0627\u0631\u062C\u0639 \u062A\u062F\u0631\u0651\u0628!</span>';
        }

        var dayWord = s.current === 1 ? '\u064A\u0648\u0645' : (s.current >= 3 && s.current <= 10 ? '\u0623\u064A\u0627\u0645' : '\u064A\u0648\u0645');

        return '<div style="display:flex;align-items:center;justify-content:space-between">'
            + '<div style="display:flex;align-items:center;gap:12px">'
            + '<span style="font-size:36px;line-height:1">' + emoji + '</span>'
            + '<div>'
            + '<p style="font-family:Cairo,sans-serif;font-size:24px;font-weight:900;color:#fb923c;line-height:1">' + s.current + '</p>'
            + '<p style="font-size:11px;color:rgba(251,146,60,0.6)">' + dayWord + ' \u0645\u062A\u0648\u0627\u0635\u0644</p>'
            + '</div></div>'
            + '<div style="text-align:left">' + statusHTML + '</div>'
            + '</div>';
    }

    // ══════════════════════════════════════
    //  توليد HTML للبادجات
    // ══════════════════════════════════════
    function renderBadgeGrid(badgeResult){
        var html = '';
        BADGES.forEach(function(badge){
            var isEarned = badgeResult.earned.some(function(b){ return b.id === badge.id; });
            if(isEarned){
                html += '<div style="text-align:center;padding:10px 4px">'
                    + '<div style="font-size:28px;margin-bottom:4px">' + badge.emoji + '</div>'
                    + '<p style="font-size:11px;font-weight:700;color:#e2e8f0">' + badge.nameAr + '</p>'
                    + '<p style="font-size:9px;color:rgba(196,181,253,0.45);margin-top:2px">' + badge.descAr + '</p>'
                    + '</div>';
            } else {
                html += '<div style="text-align:center;padding:10px 4px;opacity:0.3;filter:grayscale(1)">'
                    + '<div style="font-size:28px;margin-bottom:4px;position:relative">' + badge.emoji
                    + '<span style="position:absolute;bottom:-2px;right:calc(50% - 8px);font-size:12px">\uD83D\uDD12</span></div>'
                    + '<p style="font-size:11px;font-weight:700;color:#e2e8f0">' + badge.nameAr + '</p>'
                    + '<p style="font-size:9px;color:rgba(196,181,253,0.45);margin-top:2px">' + badge.descAr + '</p>'
                    + '</div>';
            }
        });
        return html;
    }

    // ══════════════════════════════════════
    //  توليد HTML لاحتفال بادج جديد
    // ══════════════════════════════════════
    function renderNewBadgeCelebration(newBadges){
        if(!newBadges || !newBadges.length) return '';
        var html = '';
        newBadges.forEach(function(b){
            html += '<div style="display:inline-flex;flex-direction:column;align-items:center;gap:4px;padding:8px 12px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:12px">'
                + '<span style="font-size:32px;animation:badgePop 0.5s cubic-bezier(0.68,-0.55,0.27,1.55)">' + b.emoji + '</span>'
                + '<span style="font-size:11px;font-weight:700;color:#c4b5fd">' + b.nameAr + '</span>'
                + '</div>';
        });
        return html;
    }

    // ══════════════════════════════════════
    //  توليد HTML لمعاينة المتصدرين
    // ══════════════════════════════════════
    function renderLeaderboardPreview(data, currentUserId){
        if(!data || !data.length) return '<div style="text-align:center;padding:16px 8px">'
            + '<p style="font-size:32px;margin-bottom:8px">\uD83C\uDFC5</p>'
            + '<p style="font-family:Cairo,sans-serif;font-size:14px;font-weight:900;color:rgba(196,181,253,0.6)">\u0643\u0646 \u0623\u0648\u0644 \u0627\u0644\u0645\u062A\u0635\u062F\u0631\u064A\u0646!</p>'
            + '<p style="font-size:11px;color:rgba(196,181,253,0.3);margin-top:4px">\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0648\u062A\u0646\u0627\u0641\u0633 \u0645\u0639 \u0632\u0645\u0644\u0627\u0626\u0643</p>'
            + '<a href="select-section.html" style="display:inline-block;margin-top:12px;padding:8px 20px;font-size:12px;font-weight:700;color:white;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;text-decoration:none">\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \uD83D\uDE80</a>'
            + '</div>';
        var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']; // 🥇🥈🥉
        var html = '';
        var top3 = data.slice(0, 3);
        top3.forEach(function(u, i){
            var isMe = u.user_id === currentUserId;
            var bg = isMe ? 'rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)';
            html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:' + bg + '">'
                + '<span style="font-size:18px;width:28px;text-align:center">' + medals[i] + '</span>'
                + '<span style="font-size:20px">' + (u.avatar_emoji || '\uD83D\uDC64') + '</span>'
                + '<span style="flex:1;font-size:13px;font-weight:700;color:#e2e8f0">' + (u.display_name || '\u0637\u0627\u0644\u0628') + (isMe ? ' (\u0623\u0646\u062A)' : '') + '</span>'
                + '<span style="font-family:Cairo,sans-serif;font-size:14px;font-weight:900;color:#818cf8">' + (u.xp || 0).toLocaleString('ar-SA') + ' XP</span>'
                + '</div>';
        });
        return html;
    }

    // ══════════════════════════════════════
    //  تصدير عام
    // ══════════════════════════════════════
    window.Gamification = {
        // الأساسيات
        calculateStreak: calculateStreak,
        calculateXP: calculateXP,
        calculateSessionXP: calculateSessionXP,
        calculateBadges: calculateBadges,
        calculateMaxConsecutive: calculateMaxConsecutive,
        // المستويات
        calculateLevel: calculateLevel,
        LEVELS: LEVELS,
        // التحديات اليومية
        getDailyChallenge: getDailyChallenge,
        updateDailyChallenge: updateDailyChallenge,
        // مكافآت السلسلة
        getStreakBonus: getStreakBonus,
        getStreakTierAr: getStreakTierAr,
        // الكاش
        getStreakCache: getStreakCache,
        setStreakCache: setStreakCache,
        getBadgeCache: getBadgeCache,
        // درع السلسلة
        useStreakFreeze: useStreakFreeze,
        canUseFreeze: canUseFreeze,
        // العرض
        renderStreakWidget: renderStreakWidget,
        renderBadgeGrid: renderBadgeGrid,
        renderNewBadgeCelebration: renderNewBadgeCelebration,
        renderLeaderboardPreview: renderLeaderboardPreview,
        // البيانات
        BADGES: BADGES,
        getTodayRiyadh: getTodayRiyadh
    };

})();
