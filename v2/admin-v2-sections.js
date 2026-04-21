/**
 * admin-v2-sections.js — تعريفات الأقسام الـ 16 المتبقية
 * يستخدم window.A = { sb, M, profile, currentPage }
 */
(function(){
'use strict';

const fmt = n => (n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const esc = s => { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
const SECTION_MAP = { quant:'قدرات كمي', verbal:'قدرات لفظي', tahsili:'تحصيلي', mixed:'مختلط' };
const sectionTag = s => SECTION_MAP[s] || s || 'عام';

function $c() { return document.getElementById('contentArea'); }

// ═══════════════════════════════════════════════════════
// 2. QUESTIONS
// ═══════════════════════════════════════════════════════
window.loadQuestions = async function(page=1) {
    const { sb } = window.A;
    const PAGE_SIZE = 20;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
        <div class="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" id="qSearch" placeholder="ابحث في الأسئلة..." oninput="qSearchDebounce()">
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <select class="form-select" id="qSectionFilter" style="width:auto" onchange="loadQuestions(1)">
                <option value="">كل الأقسام</option>
                <option value="quant">قدرات كمي</option>
                <option value="verbal">قدرات لفظي</option>
                <option value="tahsili">تحصيلي</option>
            </select>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--i2);cursor:pointer">
                <input type="checkbox" id="qMissingOnly" onchange="loadQuestions(1)" style="cursor:pointer">
                بدون إجابة فقط
            </label>
            <button class="btn btn-pri" onclick="openQuestionModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>إضافة سؤال</button>
        </div>
    </div>
    <div id="qFilterCounts" class="q-filter-row"></div>
    <div id="qList"><div class="loader">جاري التحميل...</div></div>
    <div id="qPagination"></div>`;

    try {
        const section = document.getElementById('qSectionFilter').value;
        const search = (document.getElementById('qSearch')?.value || '').trim();
        const missingOnly = document.getElementById('qMissingOnly')?.checked;

        let q = sb.from('questions').select('id,question_text,choices,correct_index,explanation,section,topic,image_url,disabled,created_at', { count:'exact' })
            .eq('disabled', false);
        if (section) q = q.eq('section', section);
        if (search) q = q.ilike('question_text', '%'+search+'%');
        if (missingOnly) q = q.is('correct_index', null);

        const { data, count } = await q.order('created_at',{ascending:false})
            .range((page-1)*PAGE_SIZE, page*PAGE_SIZE - 1);

        // Filter counts + عدّاد الأسئلة بدون إجابة
        const [qc, vc, tc, mc] = await Promise.all([
            sb.from('questions').select('*',{count:'exact',head:true}).eq('section','quant').eq('disabled',false),
            sb.from('questions').select('*',{count:'exact',head:true}).eq('section','verbal').eq('disabled',false),
            sb.from('questions').select('*',{count:'exact',head:true}).eq('section','tahsili').eq('disabled',false),
            sb.from('questions').select('*',{count:'exact',head:true}).is('correct_index', null).eq('disabled',false)
        ]);

        const filterCountsEl = document.getElementById('qFilterCounts');
        if (filterCountsEl) {
            const missingCount = mc.count || 0;
            const missingWarn = missingCount > 0
                ? ` · <span style="color:var(--dng);font-weight:700">⚠️ ${fmt(missingCount)} بدون إجابة</span>`
                : '';
            filterCountsEl.innerHTML = `
            <div style="font-size:11px;color:var(--i3)">
                المجموع: <b>${fmt(count||0)}</b> سؤال ·
                كمي: ${fmt(qc.count||0)} · لفظي: ${fmt(vc.count||0)} · تحصيلي: ${fmt(tc.count||0)}${missingWarn}
            </div>`;
        }

        const list = document.getElementById('qList');
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">لا أسئلة</div></div>';
            return;
        }

        list.innerHTML = data.map(q => {
            const tagClass = q.section === 'verbal' ? 'lf' : q.section === 'tahsili' ? 'th' : '';
            const choices = q.choices || [];
            const missingCI = q.correct_index === null || q.correct_index === undefined;
            const missingBadge = missingCI
                ? '<span style="display:inline-block;margin-right:6px;padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.12);border:1px solid var(--dng);color:var(--dng);font-size:10px;font-weight:700">⚠️ بدون إجابة</span>'
                : '';
            const cardBorder = missingCI ? 'border-right:3px solid var(--dng);' : '';
            return `<div class="q-card" style="${cardBorder}">
                <div class="q-card-top">
                    <div>
                        <span class="q-tag ${tagClass}">${sectionTag(q.section)}${q.topic ? ' · ' + esc(q.topic) : ''}</span>
                        ${missingBadge}
                    </div>
                    <div class="q-actions">
                        <button class="q-act-btn" onclick='editQuestion(${JSON.stringify(q.id)})' title="تعديل"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="q-act-btn" onclick='deleteQuestion(${JSON.stringify(q.id)})' title="حذف"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                </div>
                ${q.image_url ? '<img class="q-img-preview" src="'+esc(q.image_url)+'" onerror="this.style.display=\'none\'">' : ''}
                <div class="q-txt">${esc(q.question_text)}</div>
                <div class="q-opts-preview">
                    ${choices.map((c,i) => '<span class="q-opt-p'+(i===q.correct_index?' correct':'')+'">'+(i+1)+'. '+esc((c||'').substring(0,40))+'</span>').join('')}
                </div>
            </div>`;
        }).join('');

        // Pagination
        const totalPages = Math.ceil((count||0) / PAGE_SIZE);
        if (totalPages > 1) {
            let pg = '<div class="pagination"><div class="pg-info">صفحة '+page+' من '+totalPages+'</div><div class="pg-btns">';
            pg += '<button class="pg-btn" '+(page<=1?'disabled':'')+' onclick="loadQuestions('+(page-1)+')"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>';
            pg += '<button class="pg-btn" '+(page>=totalPages?'disabled':'')+' onclick="loadQuestions('+(page+1)+')"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>';
            pg += '</div></div>';
            document.getElementById('qPagination').innerHTML = pg;
        }
    } catch(e) {
        console.error(e);
        document.getElementById('qList').innerHTML = '<div class="empty"><div class="empty-ic">⚠️</div><div class="empty-d">خطأ: '+(e.message||'')+'</div></div>';
    }
};

let qSearchTimer;
window.qSearchDebounce = function() { clearTimeout(qSearchTimer); qSearchTimer = setTimeout(()=>loadQuestions(1), 400); };

window.openQuestionModal = function(existing) {
    const isEdit = !!existing;
    const data = existing || { section:'quant', question_type:'اختيار من متعدد', question_text:'', choices:['','','',''], correct_index:0, explanation:'', image_url:'' };
    const body = `
    <div class="form-grid">
        <div class="form-field">
            <label class="form-label">القسم</label>
            <select class="form-select" id="mqSection">
                <option value="quant" ${data.section==='quant'?'selected':''}>قدرات كمي</option>
                <option value="verbal" ${data.section==='verbal'?'selected':''}>قدرات لفظي</option>
                <option value="tahsili" ${data.section==='tahsili'?'selected':''}>تحصيلي</option>
            </select>
        </div>
        <div class="form-field">
            <label class="form-label">نوع السؤال</label>
            <select class="form-select" id="mqType">
                <option value="اختيار من متعدد" ${data.question_type==='اختيار من متعدد'?'selected':''}>اختيار من متعدد</option>
                <option value="قطعة" ${data.question_type==='قطعة'?'selected':''}>قطعة</option>
                <option value="صورة" ${data.question_type==='صورة'?'selected':''}>صورة</option>
            </select>
        </div>
        <div class="form-field full">
            <label class="form-label">نص السؤال</label>
            <textarea class="form-textarea" id="mqText">${esc(data.question_text)}</textarea>
        </div>
        <div class="form-field full">
            <label class="form-label">صورة السؤال (اختياري)</label>
            <div style="display:flex;gap:8px;margin-bottom:8px">
                <button type="button" class="btn btn-ghost" onclick="document.getElementById('mqImageFile').click()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>رفع ملف</button>
                <input type="file" id="mqImageFile" accept="image/*" style="display:none" onchange="uploadQuestionImage(this)">
                <span style="font-size:11px;color:var(--i4);align-self:center">أو</span>
                <input class="form-input" id="mqImage" type="url" placeholder="لصق رابط الصورة (URL)" value="${esc(data.image_url||'')}" style="flex:1" oninput="refreshImagePreview()">
            </div>
            <div id="mqImagePrev" style="margin-top:8px">${data.image_url?'<img src="'+esc(data.image_url)+'" style="max-width:200px;max-height:120px;border-radius:6px;border:1px solid var(--ln)" onerror="this.style.display=\'none\'"><button class="btn btn-dng" style="margin-right:8px" onclick="document.getElementById(\'mqImage\').value=\'\';document.getElementById(\'mqImagePrev\').innerHTML=\'\'">حذف الصورة</button>':''}</div>
            <div style="font-size:10px;color:var(--i4);margin-top:4px">الصيغ المدعومة: JPG, PNG, WebP · الحد الأقصى: 2MB</div>
        </div>
        ${[1,2,3,4].map(i => `
        <div class="form-field">
            <label class="form-label">الخيار ${i}</label>
            <input class="form-input" id="mqC${i-1}" value="${esc(data.choices[i-1]||'')}">
        </div>`).join('')}
        <div class="form-field full">
            <label class="form-label">الإجابة الصحيحة</label>
            <select class="form-select" id="mqCorrect">
                ${[0,1,2,3].map(i => '<option value="'+i+'" '+(data.correct_index===i?'selected':'')+'>الخيار '+(i+1)+'</option>').join('')}
            </select>
        </div>
        <div class="form-field full">
            <label class="form-label">الشرح</label>
            <textarea class="form-textarea" id="mqExp">${esc(data.explanation||'')}</textarea>
        </div>
    </div>`;
    const foot = '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="saveQuestion('+(isEdit?'"'+existing.id+'"':'null')+')">حفظ</button>';
    openModal(isEdit ? 'تعديل سؤال' : 'إضافة سؤال جديد', body, foot);

};

window.refreshImagePreview = function() {
    const url = (document.getElementById('mqImage')?.value || '').trim();
    const prev = document.getElementById('mqImagePrev');
    if (!prev) return;
    prev.innerHTML = url
        ? '<img src="'+esc(url)+'" style="max-width:200px;max-height:120px;border-radius:6px;border:1px solid var(--ln)" onerror="this.style.display=\'none\'"><button class="btn btn-dng" style="margin-right:8px" onclick="document.getElementById(\'mqImage\').value=\'\';document.getElementById(\'mqImagePrev\').innerHTML=\'\'">حذف الصورة</button>'
        : '';
};

window.uploadQuestionImage = async function(input) {
    const { sb } = window.A;
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('الملف أكبر من 2MB','err'); return; }
    if (!/^image\//.test(file.type)) { showToast('يرجى اختيار صورة','err'); return; }

    const prev = document.getElementById('mqImagePrev');
    prev.innerHTML = '<div style="font-size:11px;color:var(--i3);padding:10px">جاري الرفع...</div>';

    try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = 'questions/' + Date.now() + '-' + Math.random().toString(36).substr(2,8) + '.' + ext;
        const { error } = await sb.storage.from('question-images').upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
            // Fallback: if bucket doesn't exist yet, inform user
            if (/bucket|not found/i.test(error.message)) {
                showToast('Storage bucket "question-images" غير موجود — راجع setup','err');
            } else {
                showToast('خطأ في الرفع: ' + error.message, 'err');
            }
            prev.innerHTML = '';
            return;
        }
        const { data } = sb.storage.from('question-images').getPublicUrl(path);
        document.getElementById('mqImage').value = data.publicUrl;
        refreshImagePreview();
        showToast('تم رفع الصورة','suc');
    } catch(e) {
        showToast('خطأ: ' + e.message, 'err');
        prev.innerHTML = '';
    } finally {
        input.value = '';
    }
};

window.saveQuestion = async function(id) {
    const { sb } = window.A;
    const data = {
        section: document.getElementById('mqSection').value,
        question_type: document.getElementById('mqType').value,
        question_text: document.getElementById('mqText').value.trim(),
        choices: [0,1,2,3].map(i => document.getElementById('mqC'+i).value.trim()),
        correct_index: parseInt(document.getElementById('mqCorrect').value),
        explanation: document.getElementById('mqExp').value.trim(),
        image_url: document.getElementById('mqImage').value.trim() || null
    };
    if (!data.question_text) return showToast('نص السؤال مطلوب','err');
    if (data.choices.some(c => !c)) return showToast('كل الخيارات الأربعة مطلوبة','err');
    if (!data.explanation) return showToast('الشرح مطلوب','err');

    try {
        if (id) {
            await sb.from('questions').update(data).eq('id', id);
            showToast('تم تحديث السؤال','suc');
        } else {
            await sb.from('questions').insert(data);
            showToast('تم إضافة السؤال','suc');
        }
        closeModal();
        loadQuestions();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editQuestion = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('questions').select('*').eq('id', id).single();
    if (data) openQuestionModal(data);
};

window.deleteQuestion = async function(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    const { sb } = window.A;
    // Soft delete — set disabled=true بدل الحذف الكامل
    await sb.from('questions').update({disabled:true}).eq('id', id);
    showToast('تم حذف السؤال','suc');
    loadQuestions();
};

// ═══════════════════════════════════════════════════════
// 3. REVIEW (موحّد: أسئلة جديدة + بلاغات)
// ═══════════════════════════════════════════════════════
window.loadReview = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;gap:4px;border-bottom:1px solid var(--ln);margin-bottom:16px;padding:0 4px">
        <button class="rev-tab on" data-t="pending" onclick="switchReviewTab(this,'pending')" style="padding:10px 16px;font-size:12px;font-weight:600;background:none;border:none;border-bottom:2.5px solid var(--pri);color:var(--pri);cursor:pointer">أسئلة تحتاج مراجعة <span id="tabPendingCount" style="background:var(--pri);color:#fff;padding:1px 7px;border-radius:20px;font-size:10px;margin-right:4px">0</span></button>
        <button class="rev-tab" data-t="reports" onclick="switchReviewTab(this,'reports')" style="padding:10px 16px;font-size:12px;font-weight:600;background:none;border:none;border-bottom:2.5px solid transparent;color:var(--i3);cursor:pointer">بلاغات الطلاب <span id="tabReportsCount" style="background:var(--dng);color:#fff;padding:1px 7px;border-radius:20px;font-size:10px;margin-right:4px">0</span></button>
    </div>
    <div id="revPendingArea"><div class="loader">جاري التحميل...</div></div>
    <div id="revReportsArea" style="display:none"></div>`;

    // Load counts + default tab
    loadReviewPendingQuestions();
    loadReviewReportsCount();
};

window.switchReviewTab = function(btn, tab) {
    document.querySelectorAll('.rev-tab').forEach(b => {
        b.style.borderBottomColor = 'transparent';
        b.style.color = 'var(--i3)';
    });
    btn.style.borderBottomColor = 'var(--pri)';
    btn.style.color = 'var(--pri)';

    if (tab === 'pending') {
        document.getElementById('revPendingArea').style.display = '';
        document.getElementById('revReportsArea').style.display = 'none';
        loadReviewPendingQuestions();
    } else {
        document.getElementById('revPendingArea').style.display = 'none';
        document.getElementById('revReportsArea').style.display = '';
        loadReviewReports();
    }
};

async function loadReviewPendingQuestions() {
    const { sb } = window.A;
    const area = document.getElementById('revPendingArea');
    if (!area) return;
    area.innerHTML = '<div class="loader">جاري التحميل...</div>';
    try {
        const { data, count } = await sb.from('questions')
            .select('id,question_text,choices,correct_index,explanation,image_url,section,topic,created_at', {count:'exact'})
            .eq('status', 'review').eq('disabled', false)
            .order('created_at', {ascending:false}).limit(50);

        document.getElementById('tabPendingCount').textContent = count || 0;

        if (!data || data.length === 0) {
            area.innerHTML = '<div class="empty"><div class="empty-ic">✅</div><div class="empty-t">لا أسئلة تحتاج مراجعة</div><div class="empty-d">كل الأسئلة الجديدة تمت الموافقة عليها</div></div>';
            return;
        }

        area.innerHTML = '<div style="margin-bottom:14px;font-size:13px;color:var(--i2)"><b>'+data.length+'</b> سؤال جديد يحتاج مراجعة قبل النشر</div>' +
        data.map(q => {
            const choices = q.choices || [];
            return `<div class="review-q">
                <div class="rq-top">
                    <span class="q-tag">${sectionTag(q.section)}${q.topic?' · '+esc(q.topic):''}</span>
                    <span style="font-size:10px;color:var(--i3)">أُضيف: ${new Date(q.created_at).toLocaleDateString('ar-SA')}</span>
                </div>
                ${q.image_url ? '<img src="'+esc(q.image_url)+'" style="max-width:300px;border-radius:8px;margin-bottom:12px" onerror="this.style.display=\'none\'">' : ''}
                <div class="rq-txt">${esc(q.question_text)}</div>
                <div class="rq-opts">
                    ${choices.map((c,i) => `<div class="rq-opt ${i===q.correct_index?'marked-correct':''}"><div class="rq-opt-ltr" style="${i===q.correct_index?'background:var(--suc);border-color:var(--suc);color:#fff':''}">${i+1}</div>${esc(c)}</div>`).join('')}
                </div>
                ${q.explanation?'<div style="background:#FEFCE8;border:1px solid #FDE68A;border-radius:9px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--i2)"><b style="color:#92400E">الشرح:</b> '+esc(q.explanation)+'</div>':''}
                <div class="rq-actions">
                    <button class="btn btn-dng" onclick='approveQuestion("${q.id}","reject")'>رفض السؤال</button>
                    <button class="btn btn-ghost" onclick='editQuestion("${q.id}")'>تعديل</button>
                    <button class="btn btn-suc" onclick='approveQuestion("${q.id}","approve")'>قبول ونشر</button>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        area.innerHTML = '<div class="empty-d">خطأ: '+e.message+'</div>';
    }
}

async function loadReviewReportsCount() {
    const { sb } = window.A;
    try {
        const { count } = await sb.from('reports').select('*',{count:'exact',head:true}).eq('status','pending');
        document.getElementById('tabReportsCount').textContent = count || 0;
    } catch(e){}
}

async function loadReviewReports() {
    const { sb } = window.A;
    const area = document.getElementById('revReportsArea');
    if (!area) return;
    area.innerHTML = '<div class="loader">جاري التحميل...</div>';
    try {
        const { data, count } = await sb.from('reports')
            .select('id, reason, created_at, status, user_id, questions(id,question_text,choices,correct_index,explanation,image_url,section,topic), profiles(full_name)', {count:'exact'})
            .eq('status','pending').order('created_at',{ascending:false}).limit(50);

        document.getElementById('tabReportsCount').textContent = count || 0;

        if (!data || data.length === 0) {
            area.innerHTML = '<div class="empty"><div class="empty-ic">✅</div><div class="empty-t">لا بلاغات معلقة</div><div class="empty-d">كل البلاغات تمت مراجعتها</div></div>';
            return;
        }

        area.innerHTML = '<div style="margin-bottom:14px;font-size:13px;color:var(--i2)"><b>'+data.length+'</b> بلاغ من الطلاب يحتاج مراجعة</div>' +
        data.map(r => {
            const q = r.questions;
            if (!q) return '';
            const choices = q.choices || [];
            return `<div class="review-q">
                <div class="rq-top">
                    <span class="q-tag">${sectionTag(q.section)}</span>
                    <span style="font-size:10px;color:var(--i3)">أبلغ: <b>${esc(r.profiles?.full_name||'—')}</b> · ${new Date(r.created_at).toLocaleDateString('ar-SA')}</span>
                </div>
                ${q.image_url ? '<img src="'+esc(q.image_url)+'" style="max-width:300px;border-radius:8px;margin-bottom:12px" onerror="this.style.display=\'none\'">' : ''}
                <div class="rq-txt">${esc(q.question_text)}</div>
                <div class="rq-opts">
                    ${choices.map((c,i) => `<div class="rq-opt ${i===q.correct_index?'marked-correct':''}"><div class="rq-opt-ltr" style="${i===q.correct_index?'background:var(--suc);border-color:var(--suc);color:#fff':''}">${i+1}</div>${esc(c)}</div>`).join('')}
                </div>
                <div style="background:var(--dng-s);border:1px solid rgba(239,68,68,.15);border-radius:9px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--i2)"><b style="color:var(--dng)">سبب البلاغ:</b> ${esc(r.reason)}</div>
                <div class="rq-actions">
                    <button class="btn btn-dng" onclick='resolveReport("${r.id}","rejected","${q.id}",false)'>رفض السؤال</button>
                    <button class="btn btn-ghost" onclick='resolveReport("${r.id}","edit","${q.id}",false)'>تعديل وقبول</button>
                    <button class="btn btn-suc" onclick='resolveReport("${r.id}","resolved","${q.id}",true)'>قبول كما هو</button>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        area.innerHTML = '<div class="empty-d">خطأ: '+e.message+'</div>';
    }
}

window.approveQuestion = async function(id, action) {
    const { sb } = window.A;
    try {
        if (action === 'approve') {
            await sb.from('questions').update({status:'active'}).eq('id', id);
            showToast('تم قبول ونشر السؤال','suc');
        } else if (action === 'reject') {
            if (!confirm('تأكيد رفض السؤال؟')) return;
            await sb.from('questions').update({status:'rejected',disabled:true}).eq('id', id);
            showToast('تم رفض السؤال','suc');
        }
        loadReviewPendingQuestions();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.resolveReport = async function(reportId, action, questionId, keepQuestion) {
    const { sb, profile } = window.A;
    try {
        if (action === 'rejected') {
            // Disable the question + reject report
            await sb.from('questions').update({disabled:true}).eq('id', questionId);
            await sb.from('reports').update({status:'rejected',resolved_at:new Date().toISOString(),resolved_by:profile.id}).eq('id', reportId);
            showToast('تم حذف السؤال','suc');
        } else if (action === 'edit') {
            const { data:q } = await sb.from('questions').select('*').eq('id', questionId).single();
            await sb.from('reports').update({status:'resolved',resolved_at:new Date().toISOString(),resolved_by:profile.id}).eq('id', reportId);
            if (q) openQuestionModal(q);
            return;
        } else {
            await sb.from('reports').update({status:'resolved',resolved_at:new Date().toISOString(),resolved_by:profile.id}).eq('id', reportId);
            showToast('تم قبول السؤال كما هو','suc');
        }
        loadReview();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// 4. USERS
// ═══════════════════════════════════════════════════════
window.loadUsers = async function(page=1) {
    const { sb } = window.A;
    const PAGE_SIZE = 20;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
        <div class="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" id="uSearch" placeholder="ابحث بالاسم أو الجوال..." oninput="uSearchDebounce()">
        </div>
        <div style="display:flex;gap:8px">
            <select class="form-select" id="uFilter" style="width:auto" onchange="loadUsers(1)">
                <option value="">كل الأعضاء</option>
                <option value="subscribed">مشتركون</option>
                <option value="free">مجانيون</option>
                <option value="expired">منتهي</option>
            </select>
            <button class="btn btn-ghost" onclick="exportUsers()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>تصدير CSV</button>
        </div>
    </div>
    <div class="card"><div class="tbl-wrap" id="uTable"><div class="loader">جاري التحميل...</div></div></div>`;

    try {
        const search = (document.getElementById('uSearch')?.value || '').trim();
        const filter = document.getElementById('uFilter').value;

        let q = sb.from('profiles').select('id,full_name,phone,subscription_type,subscription_end,created_at,last_seen_at,used_coupon', { count:'exact' });
        if (search) q = q.or('full_name.ilike.%'+search+'%,phone.ilike.%'+search+'%');
        const nowISO = new Date().toISOString();
        if (filter === 'subscribed') q = q.in('subscription_type',['monthly','yearly','quarterly']).gt('subscription_end', nowISO);
        else if (filter === 'free') q = q.or('subscription_type.is.null,subscription_type.eq.free');
        else if (filter === 'expired') q = q.lt('subscription_end', nowISO);

        const { data, count } = await q.order('created_at',{ascending:false}).range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1);

        const tbl = document.getElementById('uTable');
        if (!data || data.length === 0) {
            tbl.innerHTML = '<div class="empty"><div class="empty-ic">👥</div><div class="empty-t">لا أعضاء</div></div>';
            return;
        }

        // Get attempts counts for each user (simplified)
        const uids = data.map(u => u.id);
        const { data: attemptsData } = await sb.from('attempts').select('user_id,is_correct').in('user_id', uids);
        const stats = {};
        (attemptsData||[]).forEach(a => {
            if (!stats[a.user_id]) stats[a.user_id] = { total:0, correct:0 };
            stats[a.user_id].total++;
            if (a.is_correct) stats[a.user_id].correct++;
        });

        tbl.innerHTML = `<table>
            <thead><tr><th>العضو</th><th>الجوال</th><th>الاشتراك</th><th>الانضمام</th><th>آخر نشاط</th><th>المحاولات</th><th>الدقة</th><th></th></tr></thead>
            <tbody>${data.map(u => {
                const st = stats[u.id] || {total:0,correct:0};
                const acc = st.total > 0 ? Math.round(st.correct/st.total*100) : 0;
                const sub = (u.subscription_type && u.subscription_type !== 'free' && u.subscription_end && new Date(u.subscription_end) > new Date())
                    ? '<span class="status-pill active">' + (u.subscription_type === 'yearly' ? 'سنوي' : u.subscription_type === 'quarterly' ? '3 أشهر' : 'شهري') + '</span>'
                    : '<span class="status-pill free">مجاني</span>';
                const lastSeen = u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}) : '—';
                const joined = new Date(u.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'});
                const name = u.full_name || '—';
                return `<tr>
                    <td><div style="display:flex;align-items:center;gap:10px"><div class="tbl-avatar">${esc(name.charAt(0))}</div><div class="td-name">${esc(name)}</div></div></td>
                    <td class="td-muted">${esc(u.phone||'—')}</td>
                    <td>${sub}</td>
                    <td class="td-muted">${joined}</td>
                    <td class="td-muted">${lastSeen}</td>
                    <td><b>${fmt(st.total)}</b></td>
                    <td><b style="color:${acc>=70?'var(--suc)':acc>=50?'var(--acc)':'var(--dng)'}">${acc}%</b></td>
                    <td><button class="q-act-btn" onclick="viewUser('${u.id}')"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;

        // Pagination
        const totalPages = Math.ceil((count||0)/PAGE_SIZE);
        if (totalPages > 1) {
            tbl.innerHTML += '<div class="pagination" style="padding:14px"><div class="pg-info">'+fmt(count)+' عضو · صفحة '+page+'/'+totalPages+'</div><div class="pg-btns"><button class="pg-btn" '+(page<=1?'disabled':'')+' onclick="loadUsers('+(page-1)+')"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button><button class="pg-btn" '+(page>=totalPages?'disabled':'')+' onclick="loadUsers('+(page+1)+')"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button></div></div>';
        }
    } catch(e) { document.getElementById('uTable').innerHTML = '<div class="empty-d">خطأ: '+e.message+'</div>'; }
};

let uSearchTimer;
window.uSearchDebounce = function() { clearTimeout(uSearchTimer); uSearchTimer = setTimeout(()=>loadUsers(1), 400); };

window.viewUser = async function(id) {
    const { sb } = window.A;
    const { data: u } = await sb.from('profiles').select('*').eq('id', id).single();
    if (!u) return;
    // تاريخ الانتهاء بصيغة YYYY-MM-DD للإدخال
    const endDateVal = u.subscription_end ? new Date(u.subscription_end).toISOString().split('T')[0] : '';
    const subType = u.subscription_type || 'free';
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">الاسم الكامل</label><input class="form-input" id="euName" value="${esc(u.full_name||'')}"></div>
        <div class="form-field"><label class="form-label">الجوال</label><input class="form-input" id="euPhone" value="${esc(u.phone||'')}" placeholder="+966..."></div>
        <div class="form-field"><label class="form-label">البريد الإلكتروني</label><input class="form-input" id="euEmail" value="${esc(u.email||'')}" readonly style="background:var(--s2);color:var(--i4)"></div>
        <div class="form-field"><label class="form-label">كود الإحالة</label><input class="form-input" id="euRef" value="${esc(u.referral_code||'')}" placeholder="MADAR-..."></div>

        <div class="form-field full"><hr style="border:none;border-top:1px solid var(--ln);margin:4px 0"></div>

        <div class="form-field"><label class="form-label">نوع الاشتراك *</label>
            <select class="form-select" id="euSub">
                <option value="free" ${subType==='free'?'selected':''}>مجاني</option>
                <option value="monthly" ${subType==='monthly'?'selected':''}>شهري (Pro)</option>
                <option value="quarterly" ${subType==='quarterly'?'selected':''}>ربع سنوي</option>
                <option value="yearly" ${subType==='yearly'?'selected':''}>سنوي (Elite)</option>
            </select>
        </div>
        <div class="form-field"><label class="form-label">تاريخ انتهاء الاشتراك</label><input class="form-input" id="euEnd" type="date" value="${endDateVal}"></div>

        <div class="form-field full"><label class="form-label">الكوبون المستخدم</label><input class="form-input" id="euCoupon" value="${esc(u.used_coupon||'')}" placeholder="—"></div>

        <div class="form-field full"><hr style="border:none;border-top:1px solid var(--ln);margin:4px 0"></div>

        <div style="grid-column:span 2;background:var(--s2);padding:12px 14px;border-radius:10px;font-size:12px;color:var(--i3);line-height:2">
            <div><b>XP:</b> ${u.xp||0} &nbsp;·&nbsp; <b>المستوى:</b> ${u.level||1} (${esc(u.level_name||'مبتدئ')}) &nbsp;·&nbsp; <b>السلسلة:</b> ${u.streak_days||0} يوم</div>
            <div><b>سُجّل:</b> ${new Date(u.created_at).toLocaleDateString('ar-SA')} &nbsp;·&nbsp; <b>آخر دخول:</b> ${u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString('ar-SA') : '—'}</div>
        </div>
    </div>`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="saveUser('${u.id}')">حفظ التغييرات</button>
    `;
    openModal('تعديل بيانات العضو', body, foot);
};

// ── حفظ تعديلات العضو ──
window.saveUser = async function(id) {
    const { sb } = window.A;
    const patch = {
        full_name: document.getElementById('euName').value.trim() || null,
        phone: document.getElementById('euPhone').value.trim() || null,
        referral_code: document.getElementById('euRef').value.trim() || null,
        subscription_type: document.getElementById('euSub').value,
        used_coupon: document.getElementById('euCoupon').value.trim() || null
    };
    const endVal = document.getElementById('euEnd').value;
    patch.subscription_end = endVal ? new Date(endVal + 'T23:59:59').toISOString() : null;
    // لو "مجاني" → امسح تاريخ الانتهاء
    if (patch.subscription_type === 'free') patch.subscription_end = null;

    try {
        const { error } = await sb.from('profiles').update(patch).eq('id', id);
        if (error) throw error;
        showToast('حُفظت التغييرات','success');
        closeModal();
        loadUsers();
    } catch(e) {
        showToast('خطأ: '+(e.message||'فشل الحفظ'),'error');
    }
};

window.exportUsers = async function() {
    const { sb } = window.A;
    showToast('جاري التصدير...','');
    try {
        const { data } = await sb.from('profiles').select('full_name,phone,subscription_type,subscription_end,created_at,xp').order('created_at',{ascending:false}).limit(5000);
        if (!data) return;
        const rows = [['الاسم','الجوال','الاشتراك','ينتهي','تاريخ التسجيل','XP']];
        data.forEach(u => rows.push([u.full_name||'', u.phone||'', u.subscription_type||'free', u.subscription_end||'', u.created_at||'', u.xp||0]));
        const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
        const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'users-'+new Date().toISOString().split('T')[0]+'.csv';
        a.click();
        showToast('تم التصدير','suc');
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// 5. PLANS
// ═══════════════════════════════════════════════════════
window.loadPlans = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">خطط الاشتراك</div>
        <button class="btn btn-pri" onclick="openPlanModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>إضافة خطة</button>
    </div>
    <div id="plansGrid" class="plan-grid"><div class="loader">جاري التحميل...</div></div>

    <div class="card" style="margin-top:24px"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div><div class="card-title">إعدادات الإحالة</div><div class="card-sub">أيام المكافأة للمُحيل والمُحال</div></div></div></div>
    <div class="card-body" id="refSettingsBox"><div class="loader">...</div></div></div>`;

    try {
        const { data: plans } = await sb.from('plans').select('*').order('sort_order');
        const grid = document.getElementById('plansGrid');
        if (!plans || plans.length === 0) {
            grid.innerHTML = '<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">لا خطط</div></div>';
        } else {
            grid.innerHTML = plans.map(p => {
                const hasDiscount = p.original_price && Number(p.original_price) > Number(p.price);
                const pct = hasDiscount ? Math.round((1 - Number(p.price)/Number(p.original_price)) * 100) : (p.discount_percentage || 0);
                return `
                <div class="plan-card${p.is_featured?' featured':''}">
                    <div class="plan-name">${esc(p.name)}</div>
                    ${hasDiscount ? '<div style="font-size:13px;color:var(--i4);text-decoration:line-through;margin-bottom:2px">'+p.original_price+' ريال</div>' : ''}
                    <div class="plan-price">${p.price} <small>ريال</small></div>
                    ${hasDiscount ? '<div style="display:inline-block;background:var(--dng);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;margin-top:4px">-'+pct+'%</div>' : ''}
                    <div class="plan-duration" style="margin-top:8px">${p.duration_days} يوم</div>
                    ${p.savings_text ? '<div style="font-size:10px;color:var(--suc);font-weight:600;margin-bottom:8px">'+esc(p.savings_text)+'</div>' : ''}
                    <div class="plan-subs">مشتركون حالياً: <span>${p.subscriber_count||0}</span></div>
                    <div style="margin-top:12px;display:flex;gap:6px">
                        <button class="btn btn-ghost" onclick='editPlan(${JSON.stringify(p.id)})'><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>تعديل</button>
                    </div>
                </div>`;
            }).join('');
        }

        // Referral settings
        const { data: rs } = await sb.from('referral_settings').select('*').limit(1).single();
        document.getElementById('refSettingsBox').innerHTML = `
        <div class="form-grid">
            <div class="form-field">
                <label class="form-label">أيام المكافأة للمُحيل</label>
                <input class="form-input" type="number" id="refBonus1" value="${rs?.referrer_bonus_days||10}">
            </div>
            <div class="form-field">
                <label class="form-label">أيام المكافأة للمُحال</label>
                <input class="form-input" type="number" id="refBonus2" value="${rs?.referred_bonus_days||7}">
            </div>
        </div>
        <button class="btn btn-pri" style="margin-top:12px" onclick="saveRefSettings(${rs?.id?'"'+rs.id+'"':'null'})">حفظ</button>`;
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.openPlanModal = function(existing) {
    const d = existing || { name:'', slug:'', price:0, original_price:null, discount_percentage:0, duration_days:30, is_active:true, is_featured:false, savings_text:'' };
    // استنتج نوع الخصم الافتراضي
    const hasDiscount = d.original_price && Number(d.original_price) > Number(d.price);
    const defaultType = (d.discount_percentage && !hasDiscount) ? 'percent' : 'amount';
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">الاسم</label><input class="form-input" id="pnName" value="${esc(d.name)}" placeholder="شهري"></div>
        <div class="form-field"><label class="form-label">المعرف (slug)</label><input class="form-input" id="pnSlug" value="${esc(d.slug)}" ${existing?'readonly':''} placeholder="monthly"></div>

        <div class="form-field full" style="background:var(--s2);border-radius:var(--r);padding:12px;border:1px solid var(--ln)">
            <label class="form-label" style="margin-bottom:8px;display:block"><b>التسعير والخصم</b></label>

            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label">السعر الأصلي *</label>
                    <input class="form-input" type="number" step="0.01" id="pnOriginalPrice" value="${d.original_price||d.price||''}" placeholder="مثلاً 115" oninput="calcDiscountAuto()">
                    <div style="font-size:9px;color:var(--i4);margin-top:2px">السعر قبل الخصم</div>
                </div>
                <div class="form-field">
                    <label class="form-label">المدة (يوم) *</label>
                    <input class="form-input" type="number" id="pnDuration" value="${d.duration_days}">
                </div>
            </div>

            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--ln)">
                <label class="form-label" style="margin-bottom:6px;display:block">نوع الخصم</label>
                <div style="display:flex;gap:8px;margin-bottom:10px">
                    <label style="flex:1;padding:9px;border-radius:8px;border:1.5px solid ${defaultType==='percent'?'var(--pri)':'var(--ln2)'};${defaultType==='percent'?'background:var(--pri-s);color:var(--pri);':''}font-size:12px;font-weight:600;text-align:center;cursor:pointer">
                        <input type="radio" name="pnDiscType" value="percent" ${defaultType==='percent'?'checked':''} onchange="setDiscountType('percent')" style="margin-left:6px">نسبة مئوية %
                    </label>
                    <label style="flex:1;padding:9px;border-radius:8px;border:1.5px solid ${defaultType==='amount'?'var(--pri)':'var(--ln2)'};${defaultType==='amount'?'background:var(--pri-s);color:var(--pri);':''}font-size:12px;font-weight:600;text-align:center;cursor:pointer">
                        <input type="radio" name="pnDiscType" value="amount" ${defaultType==='amount'?'checked':''} onchange="setDiscountType('amount')" style="margin-left:6px">مبلغ ثابت (ريال)
                    </label>
                    <label style="flex:1;padding:9px;border-radius:8px;border:1.5px solid ${defaultType==='none'?'var(--pri)':'var(--ln2)'};${defaultType==='none'?'background:var(--pri-s);color:var(--pri);':''}font-size:12px;font-weight:600;text-align:center;cursor:pointer">
                        <input type="radio" name="pnDiscType" value="none" onchange="setDiscountType('none')" style="margin-left:6px">بدون خصم
                    </label>
                </div>

                <div class="form-grid" id="pnDiscountInputs">
                    <div class="form-field" id="pnPctField">
                        <label class="form-label">نسبة الخصم %</label>
                        <input class="form-input" type="number" min="0" max="100" id="pnDiscountPct" value="${d.discount_percentage||0}" placeholder="مثلاً 20" oninput="recalcFromPct()">
                    </div>
                    <div class="form-field" id="pnAmountField">
                        <label class="form-label">مبلغ الخصم (ريال)</label>
                        <input class="form-input" type="number" step="0.01" id="pnDiscountAmount" value="${hasDiscount ? (Number(d.original_price)-Number(d.price)).toFixed(2) : 0}" placeholder="مثلاً 26" oninput="recalcFromAmount()">
                    </div>
                    <div class="form-field full">
                        <label class="form-label">السعر النهائي بعد الخصم</label>
                        <input class="form-input" type="number" step="0.01" id="pnPrice" value="${d.price}" readonly style="background:var(--suc-s);color:var(--suc);font-weight:700;font-size:16px">
                    </div>
                </div>
            </div>

            <div id="pnPricePreview" style="margin-top:10px;padding:10px;background:var(--sf);border-radius:8px;border:1px solid var(--ln);font-size:12px;text-align:center">
                <div style="color:var(--i3);margin-bottom:4px">معاينة السعر في التطبيق:</div>
                <div id="pnPreviewContent"></div>
            </div>
        </div>

        <div class="form-field full"><label class="form-label">نص التوفير (اختياري)</label><input class="form-input" id="pnSavings" value="${esc(d.savings_text||'')}" placeholder="مثلاً: وفّر 26 ريال"></div>
        <div class="form-field"><label><input type="checkbox" id="pnFeatured" ${d.is_featured?'checked':''}> خطة مميزة</label></div>
        <div class="form-field"><label><input type="checkbox" id="pnActive" ${d.is_active!==false?'checked':''}> فعّالة</label></div>
    </div>`;
    openModal(existing?'تعديل خطة':'إضافة خطة', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="savePlan('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
    setTimeout(() => { setDiscountType(defaultType); }, 50);
};

let _discountType = 'amount';

window.setDiscountType = function(type) {
    _discountType = type;
    // Update label styles
    document.querySelectorAll('input[name="pnDiscType"]').forEach(r => {
        const lbl = r.closest('label');
        if (r.value === type) {
            r.checked = true;
            lbl.style.borderColor = 'var(--pri)';
            lbl.style.background = 'var(--pri-s)';
            lbl.style.color = 'var(--pri)';
        } else {
            lbl.style.borderColor = 'var(--ln2)';
            lbl.style.background = '';
            lbl.style.color = '';
        }
    });
    const pctField = document.getElementById('pnPctField');
    const amtField = document.getElementById('pnAmountField');
    if (type === 'percent') {
        pctField.style.display = ''; amtField.style.display = 'none';
        recalcFromPct();
    } else if (type === 'amount') {
        pctField.style.display = 'none'; amtField.style.display = '';
        recalcFromAmount();
    } else {
        pctField.style.display = 'none'; amtField.style.display = 'none';
        // لا خصم
        const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
        document.getElementById('pnPrice').value = orig;
        document.getElementById('pnDiscountPct').value = 0;
        document.getElementById('pnDiscountAmount').value = 0;
        updatePricePreview();
    }
};

window.recalcFromPct = function() {
    const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
    const pct = Math.max(0, Math.min(100, parseFloat(document.getElementById('pnDiscountPct').value) || 0));
    const discountAmt = orig * pct / 100;
    const finalPrice = Math.max(0, orig - discountAmt);
    document.getElementById('pnDiscountAmount').value = discountAmt.toFixed(2);
    document.getElementById('pnPrice').value = finalPrice.toFixed(2);
    updatePricePreview();
};

window.recalcFromAmount = function() {
    const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
    let amt = parseFloat(document.getElementById('pnDiscountAmount').value) || 0;
    if (amt > orig) amt = orig;
    const finalPrice = Math.max(0, orig - amt);
    const pct = orig > 0 ? Math.round(amt / orig * 100) : 0;
    document.getElementById('pnDiscountPct').value = pct;
    document.getElementById('pnPrice').value = finalPrice.toFixed(2);
    updatePricePreview();
};

window.calcDiscountAuto = function() {
    // عند تغيير السعر الأصلي، إعادة الحساب حسب النوع الحالي
    if (_discountType === 'percent') recalcFromPct();
    else if (_discountType === 'amount') recalcFromAmount();
    else {
        const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
        document.getElementById('pnPrice').value = orig;
        updatePricePreview();
    }
};

function updatePricePreview() {
    const prev = document.getElementById('pnPreviewContent');
    if (!prev) return;
    const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
    const price = parseFloat(document.getElementById('pnPrice').value) || 0;
    const pct = parseFloat(document.getElementById('pnDiscountPct').value) || 0;
    if (orig > price && pct > 0) {
        prev.innerHTML = '<span style="color:var(--i4);text-decoration:line-through;font-size:14px">'+orig+' ريال</span> <span style="margin-right:8px;color:var(--pri);font-size:20px;font-weight:700">'+price.toFixed(2)+' ريال</span> <span style="background:var(--dng);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;margin-right:6px">-'+pct+'%</span>';
    } else {
        prev.innerHTML = '<span style="color:var(--pri);font-size:20px;font-weight:700">'+(price||0).toFixed(2)+' ريال</span>';
    }
}

// legacy function name compatibility
window.calcDiscount = window.calcDiscountAuto;

window.savePlan = async function(id) {
    const { sb } = window.A;
    const origPrice = parseFloat(document.getElementById('pnOriginalPrice').value);
    const price = parseFloat(document.getElementById('pnPrice').value) || 0;
    const discountPct = parseInt(document.getElementById('pnDiscountPct').value) || 0;
    const data = {
        name: document.getElementById('pnName').value.trim(),
        slug: document.getElementById('pnSlug').value.trim(),
        price,
        original_price: (origPrice && origPrice > price) ? origPrice : null,
        discount_percentage: discountPct,
        duration_days: parseInt(document.getElementById('pnDuration').value) || 30,
        savings_text: document.getElementById('pnSavings').value.trim() || null,
        is_featured: document.getElementById('pnFeatured').checked,
        is_active: document.getElementById('pnActive').checked
    };
    if (!data.name || !data.slug) return showToast('الاسم والمعرف مطلوبان','err');
    try {
        if (id) await sb.from('plans').update(data).eq('id', id);
        else await sb.from('plans').insert(data);
        showToast('تم الحفظ','suc');
        closeModal();
        loadPlans();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editPlan = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('plans').select('*').eq('id', id).single();
    if (data) openPlanModal(data);
};

window.saveRefSettings = async function(id) {
    const { sb } = window.A;
    const data = {
        referrer_bonus_days: parseInt(document.getElementById('refBonus1').value) || 10,
        referred_bonus_days: parseInt(document.getElementById('refBonus2').value) || 7
    };
    try {
        if (id) await sb.from('referral_settings').update(data).eq('id', id);
        else await sb.from('referral_settings').insert(data);
        showToast('تم الحفظ','suc');
    } catch(e) { showToast('خطأ','err'); }
};

// ═══════════════════════════════════════════════════════
// 6. COUPONS
// ═══════════════════════════════════════════════════════
window.loadCoupons = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">الكوبونات</div>
        <button class="btn btn-pri" onclick="openCouponModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>كوبون جديد</button>
    </div>
    <div id="couponsList"><div class="loader">جاري التحميل...</div></div>`;

    try {
        const { data } = await sb.from('coupons').select('*').order('created_at',{ascending:false});
        const list = document.getElementById('couponsList');
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="empty"><div class="empty-ic">🎟️</div><div class="empty-t">لا كوبونات</div></div>';
            return;
        }
        list.innerHTML = data.map(c => {
            const isFree = c.discount_type === 'free';
            const badge = isFree ? '<span class="coupon-badge free">مجاني</span>'
                        : c.discount_type === 'percentage' ? '<span class="coupon-badge discount">-'+c.discount_value+'%</span>'
                        : '<span class="coupon-badge discount">-'+c.discount_value+' ريال</span>';
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            return `<div class="coupon-item">
                <div class="coupon-code">${esc(c.code)}</div>
                <div class="coupon-info">
                    <div class="coupon-n">${c.discount_type==='free'?'اشتراك مجاني':'خصم على الاشتراك'}</div>
                    <div class="coupon-d">${c.expires_at?'ينتهي '+new Date(c.expires_at).toLocaleDateString('ar-SA'):'لا ينتهي'}${expired?' (منتهي)':''} · ${c.plan_type==='all'?'كل الخطط':esc(c.plan_type||'—')}</div>
                </div>
                ${badge}
                <div class="coupon-uses"><div class="v">${c.used_count||0}</div><div>${c.max_uses?'من '+c.max_uses:'استخدام'}</div></div>
                <div style="display:flex;gap:4px">
                    <button class="q-act-btn" onclick='editCoupon("${c.id}")' title="تعديل"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="q-act-btn" onclick='deleteCoupon("${c.id}")' title="حذف"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
                </div>
            </div>`;
        }).join('');
    } catch(e) { showToast('خطأ','err'); }
};

window.openCouponModal = function(existing) {
    const d = existing || { code:'', discount_type:'free', discount_value:0, plan_type:'all', duration_months:1, max_uses:null, expires_at:null, is_active:true };
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">كود الكوبون</label><input class="form-input" id="cpCode" value="${esc(d.code)}" style="text-transform:uppercase"></div>
        <div class="form-field"><label class="form-label">النوع</label>
            <select class="form-select" id="cpType">
                <option value="free" ${d.discount_type==='free'?'selected':''}>مجاني</option>
                <option value="percentage" ${d.discount_type==='percentage'?'selected':''}>نسبة %</option>
                <option value="fixed" ${d.discount_type==='fixed'?'selected':''}>ثابت (ريال)</option>
            </select>
        </div>
        <div class="form-field"><label class="form-label">القيمة</label><input class="form-input" type="number" id="cpValue" value="${d.discount_value||0}"></div>
        <div class="form-field"><label class="form-label">الخطة</label>
            <select class="form-select" id="cpPlan">
                <option value="all" ${d.plan_type==='all'?'selected':''}>الكل</option>
                <option value="monthly" ${d.plan_type==='monthly'?'selected':''}>شهري</option>
                <option value="yearly" ${d.plan_type==='yearly'?'selected':''}>سنوي</option>
            </select>
        </div>
        <div class="form-field"><label class="form-label">المدة (شهور)</label><input class="form-input" type="number" id="cpMonths" value="${d.duration_months||1}"></div>
        <div class="form-field"><label class="form-label">الحد الأقصى للاستخدام</label><input class="form-input" type="number" id="cpMax" value="${d.max_uses||''}" placeholder="غير محدود"></div>
        <div class="form-field full"><label class="form-label">تاريخ الانتهاء</label><input class="form-input" type="date" id="cpExpires" value="${d.expires_at?d.expires_at.split('T')[0]:''}"></div>
        <div class="form-field"><label><input type="checkbox" id="cpActive" ${d.is_active!==false?'checked':''}> فعّال</label></div>
    </div>`;
    openModal(existing?'تعديل كوبون':'كوبون جديد', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="saveCoupon('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
};

window.saveCoupon = async function(id) {
    const { sb } = window.A;
    const data = {
        code: document.getElementById('cpCode').value.trim().toUpperCase(),
        discount_type: document.getElementById('cpType').value,
        discount_value: parseFloat(document.getElementById('cpValue').value) || 0,
        plan_type: document.getElementById('cpPlan').value,
        duration_months: parseInt(document.getElementById('cpMonths').value) || 1,
        max_uses: parseInt(document.getElementById('cpMax').value) || null,
        expires_at: document.getElementById('cpExpires').value || null,
        is_active: document.getElementById('cpActive').checked
    };
    if (!data.code) return showToast('الكود مطلوب','err');
    try {
        if (id) await sb.from('coupons').update(data).eq('id', id);
        else await sb.from('coupons').insert(data);
        showToast('تم الحفظ','suc');
        closeModal();
        loadCoupons();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editCoupon = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('coupons').select('*').eq('id', id).single();
    if (data) openCouponModal(data);
};

window.deleteCoupon = async function(id) {
    if (!confirm('هل تريد حذف الكوبون؟')) return;
    const { sb } = window.A;
    await sb.from('coupons').delete().eq('id', id);
    showToast('تم الحذف','suc');
    loadCoupons();
};

// ═══════════════════════════════════════════════════════
// 7. FINANCE (دفعات فعلية + مصروفات + صافي)
// ═══════════════════════════════════════════════════════
window.loadFinance = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <style>
    .acc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
    .acc-box{padding:18px 20px;border-radius:16px;color:#fff;position:relative;overflow:hidden;cursor:default}
    .acc-box .ah{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .acc-box .an{font-size:12px;font-weight:700;letter-spacing:.3px;opacity:.95;display:flex;align-items:center;gap:8px}
    .acc-box .an svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2}
    .acc-box .av{font-size:28px;font-weight:800;margin-bottom:2px;font-variant-numeric:tabular-nums}
    .acc-box .av small{font-size:14px;font-weight:600;opacity:.85;margin-right:4px}
    .acc-box .as{font-size:11px;opacity:.85;line-height:1.7}
    .acc-box.bank{background:linear-gradient(135deg,#1E3A8A,#3B5BDB)}
    .acc-box.treasury{background:linear-gradient(135deg,#0F766E,#14B8A6)}
    .acc-box::after{content:"";position:absolute;top:-30px;left:-30px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.05)}
    .acc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
    .acc-actions .btn svg{width:13px;height:13px}
    @media (max-width:640px){ .acc-grid{grid-template-columns:1fr} }
    </style>

    <div class="acc-actions">
        <button class="btn btn-ghost" onclick="openInitialBalanceModal()">
            <svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            ضبط الرصيد الأولي
        </button>
        <button class="btn btn-pri" onclick="openTransferModal()">
            <svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            تحويل بين الصناديق
        </button>
        <button class="btn btn-ghost" onclick="openFeesModal()">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            رسوم وسائل الدفع
        </button>
        <select class="form-select" id="finPeriod" style="width:auto;margin-right:auto" onchange="loadFinance()">
            <option value="30">آخر 30 يوم</option>
            <option value="7">آخر 7 أيام</option>
            <option value="90">آخر 90 يوم</option>
            <option value="365">آخر سنة</option>
            <option value="0">الكل</option>
        </select>
    </div>

    <!-- صندوقا البنك والخزينة -->
    <div class="acc-grid">
        <div class="acc-box bank">
            <div class="ah">
                <div class="an"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M2 11h20"/><path d="M12 3l10 4H2z"/></svg>البنك (الحساب الجاري)</div>
            </div>
            <div class="av"><span id="bankBal">—</span> <small>ر.س</small></div>
            <div class="as" id="bankSub">الرصيد الأولي + الإيرادات الصافية − المصروفات − التحويلات الصادرة</div>
        </div>
        <div class="acc-box treasury">
            <div class="ah">
                <div class="an"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 14h8"/><path d="M8 18h5"/></svg>الخزينة (الادخار)</div>
            </div>
            <div class="av"><span id="trsBal">—</span> <small>ر.س</small></div>
            <div class="as" id="trsSub">الرصيد الأولي + التحويلات الواردة − التحويلات الصادرة</div>
        </div>
    </div>

    <div style="font-size:11px;color:var(--i3);margin-bottom:12px">💡 الأرقام تعكس الدفعات الفعلية بعد خصم رسوم وسائل الدفع. الاشتراكات المجانية/الكوبونات مستبعدة.</div>

    <div class="finance-summary">
        <div class="fs-card inc"><div class="fs-label"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>الإيرادات الصافية</div><div class="fs-val" id="finInc">—</div><div class="fs-sub">ريال — <span id="finIncCount">0</span> معاملة مدفوعة · صافي بعد الرسوم</div></div>
        <div class="fs-card exp"><div class="fs-label"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>المصروفات</div><div class="fs-val" id="finExp">0</div><div class="fs-sub">ريال — <span id="finExpCount">0</span> مصروف</div></div>
        <div class="fs-card net"><div class="fs-label"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>الصافي</div><div class="fs-val" id="finNet">—</div><div class="fs-sub">الربح الصافي في الفترة</div></div>
    </div>

    <div class="card"><div class="card-hdr">
        <div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/></svg></div><div><div class="card-title">آخر الدفعات الفعلية</div><div class="card-sub">MyFatoorah فقط — بدون الاشتراكات المجانية</div></div></div>
        <button class="btn btn-ghost" onclick='switchAdminPage("invoices")'>عرض كل الفواتير</button>
    </div>
    <div class="tbl-wrap" id="txList"><div class="loader">...</div></div></div>`;

    try {
        const period = parseInt(document.getElementById('finPeriod').value) || 30;
        const sinceISO = period > 0 ? new Date(Date.now()-period*864e5).toISOString() : '1970-01-01T00:00:00Z';

        // ── جلب رسوم وسائل الدفع (إن وُجد الجدول) ──
        let feesMap = { default: { pct: 2.75, fixed: 0 } };
        try {
            const { data: fees } = await sb.from('payment_fees').select('*');
            (fees || []).forEach(f => {
                feesMap[f.payment_method] = { pct: Number(f.fee_percent || 0), fixed: Number(f.fee_fixed || 0) };
            });
        } catch(e){} // جدول ما بعد موجود → نستخدم الافتراضي
        const calcFee = (amt, method) => {
            const f = feesMap[method] || feesMap['default'];
            return Math.round((Number(amt) * f.pct / 100 + f.fixed) * 100) / 100;
        };

        // الدفعات الفعلية فقط: status=paid + payment_id لا يبدأ بـ FREE
        let q = sb.from('payments').select('id,user_id,amount,plan_type,status,paid_at,created_at,payment_id,coupon_code,payment_method,profiles(full_name)')
            .eq('status','paid').gte('paid_at', sinceISO);
        const { data: payments } = await q.order('paid_at',{ascending:false}).limit(100);

        // فلتر إضافي في الذاكرة: استبعاد الدفعات المجانية (FREE-) والكوبونات 100%
        const realPayments = (payments||[]).filter(p => {
            const pid = (p.payment_id||'').toString();
            const amt = Number(p.amount||0);
            return !pid.startsWith('FREE-') && amt > 0;
        });

        const totalIncGross = realPayments.reduce((s,p)=>s+Number(p.amount||0),0);
        const totalFees = realPayments.reduce((s,p)=>s + calcFee(p.amount, p.payment_method||'default'), 0);
        const totalIncNet = totalIncGross - totalFees;

        // المصروفات
        const { data: exps } = await sb.from('expenses').select('amount,expense_date').gte('expense_date', sinceISO.split('T')[0]);
        const totalExp = (exps||[]).reduce((s,e)=>s+Number(e.amount||0),0);

        document.getElementById('finInc').textContent = fmt(Math.round(totalIncNet));
        document.getElementById('finIncCount').textContent = realPayments.length;
        document.getElementById('finExp').textContent = fmt(Math.round(totalExp));
        document.getElementById('finExpCount').textContent = (exps||[]).length;
        document.getElementById('finNet').textContent = fmt(Math.round(totalIncNet - totalExp));

        // ── حساب أرصدة البنك والخزينة (على كل الوقت، بغض النظر عن period) ──
        await recomputeAccountBalances(sb, feesMap, calcFee);

        const list = document.getElementById('txList');
        if (realPayments.length === 0) {
            list.innerHTML = '<div class="empty"><div class="empty-d">لا دفعات فعلية في الفترة المحددة</div></div>';
            return;
        }
        list.innerHTML = '<table><thead><tr><th>العميل</th><th>الخطة</th><th>الكوبون</th><th>المبلغ</th><th>رقم الدفع</th><th>التاريخ</th></tr></thead><tbody>' +
            realPayments.slice(0,50).map(p => `<tr>
                <td class="td-name">${esc(p.profiles?.full_name||'—')}</td>
                <td>${esc(p.plan_type==='yearly'?'سنوي':p.plan_type==='monthly'?'شهري':p.plan_type||'—')}</td>
                <td class="td-muted">${p.coupon_code ? '<span class="status-pill" style="background:var(--acc-s);color:var(--acc)">'+esc(p.coupon_code)+'</span>' : '—'}</td>
                <td><b style="color:var(--suc)">+${fmt(Math.round(p.amount))} ر.س</b></td>
                <td class="td-muted" style="font-family:monospace;font-size:10px">${esc((p.payment_id||'').substring(0,14))}</td>
                <td class="td-muted">${new Date(p.paid_at||p.created_at).toLocaleDateString('ar-SA')}</td>
            </tr>`).join('') + '</tbody></table>';
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.switchAdminPage = function(page) {
    document.querySelector('[data-page="'+page+'"]')?.click();
};

// ═══════════════════════════════════════════════════════
// 7A-extra. FINANCE ACCOUNTS (bank + treasury)
// ═══════════════════════════════════════════════════════

async function recomputeAccountBalances(sb, feesMap, calcFee) {
    try {
        // 1. أرصدة أولية
        let initBank = 0, initTreasury = 0;
        try {
            const { data: accs } = await sb.from('finance_accounts').select('*');
            (accs || []).forEach(a => {
                if (a.account_type === 'bank') initBank = Number(a.initial_balance || 0);
                else if (a.account_type === 'treasury') initTreasury = Number(a.initial_balance || 0);
            });
        } catch(e) { console.warn('finance_accounts not ready:', e.message); }

        // 2. الإيرادات كاملة الوقت (للبنك)
        const { data: allPayments } = await sb.from('payments')
            .select('amount,payment_id,payment_method')
            .eq('status','paid');
        const realAll = (allPayments || []).filter(p => {
            const pid = (p.payment_id||'').toString();
            return !pid.startsWith('FREE-') && Number(p.amount||0) > 0;
        });
        const totalIncNetAll = realAll.reduce((s,p) => s + (Number(p.amount) - calcFee(p.amount, p.payment_method || 'default')), 0);

        // 3. المصروفات كاملة الوقت
        const { data: allExps } = await sb.from('expenses').select('amount');
        const totalExpAll = (allExps || []).reduce((s,e) => s + Number(e.amount || 0), 0);

        // 4. التحويلات
        let transfersFromBank = 0, transfersToBank = 0;
        let transfersFromTrs = 0, transfersToTrs = 0;
        try {
            const { data: xfers } = await sb.from('finance_transfers').select('*');
            (xfers || []).forEach(x => {
                const amt = Number(x.amount || 0);
                if (x.from_account === 'bank') transfersFromBank += amt;
                if (x.to_account === 'bank') transfersToBank += amt;
                if (x.from_account === 'treasury') transfersFromTrs += amt;
                if (x.to_account === 'treasury') transfersToTrs += amt;
            });
        } catch(e) {}

        const bankBalance = initBank + totalIncNetAll - totalExpAll - transfersFromBank + transfersToBank;
        const treasuryBalance = initTreasury - transfersFromTrs + transfersToTrs;

        document.getElementById('bankBal').textContent = fmt(Math.round(bankBalance));
        document.getElementById('trsBal').textContent = fmt(Math.round(treasuryBalance));
        document.getElementById('bankSub').textContent =
            `رصيد أولي ${fmt(Math.round(initBank))} + صافي ${fmt(Math.round(totalIncNetAll))} − مصروفات ${fmt(Math.round(totalExpAll))} − تحويلات صادرة ${fmt(Math.round(transfersFromBank))}`;
        document.getElementById('trsSub').textContent =
            `رصيد أولي ${fmt(Math.round(initTreasury))} + تحويلات واردة ${fmt(Math.round(transfersToTrs))} − صادرة ${fmt(Math.round(transfersFromTrs))}`;
    } catch(e) {
        console.error('recompute err:', e);
        document.getElementById('bankBal').textContent = '—';
        document.getElementById('trsBal').textContent = '—';
    }
}

// ── ضبط الرصيد الأولي ──
window.openInitialBalanceModal = async function() {
    const { sb } = window.A;
    let bank = 0, treasury = 0;
    try {
        const { data } = await sb.from('finance_accounts').select('*');
        (data || []).forEach(a => {
            if (a.account_type === 'bank') bank = Number(a.initial_balance || 0);
            else if (a.account_type === 'treasury') treasury = Number(a.initial_balance || 0);
        });
    } catch(e){}

    const body = `
    <div class="form-grid">
        <div class="form-field full">
            <label class="form-label">رصيد البنك الأولي (ر.س)</label>
            <input class="form-input" id="ibBank" type="number" step="0.01" value="${bank}" placeholder="0">
            <div style="font-size:10px;color:var(--i3);margin-top:4px">المبلغ الموجود في الحساب قبل بدء النظام</div>
        </div>
        <div class="form-field full">
            <label class="form-label">رصيد الخزينة الأولي (ر.س)</label>
            <input class="form-input" id="ibTrs" type="number" step="0.01" value="${treasury}" placeholder="0">
            <div style="font-size:10px;color:var(--i3);margin-top:4px">المبلغ المدخّر أو المستقطع للأرباح قبل بدء النظام</div>
        </div>
    </div>`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="saveInitialBalance()">حفظ الأرصدة</button>
    `;
    openModal('ضبط الأرصدة الأولية', body, foot);
};

window.saveInitialBalance = async function() {
    const { sb } = window.A;
    const bank = parseFloat(document.getElementById('ibBank').value) || 0;
    const trs = parseFloat(document.getElementById('ibTrs').value) || 0;
    try {
        // upsert
        const { error: e1 } = await sb.from('finance_accounts')
            .upsert([
                { account_type: 'bank',     initial_balance: bank, updated_at: new Date().toISOString() },
                { account_type: 'treasury', initial_balance: trs,  updated_at: new Date().toISOString() }
            ], { onConflict: 'account_type' });
        if (e1) throw e1;
        showToast('حُفظت الأرصدة','success');
        closeModal();
        loadFinance();
    } catch(e) {
        showToast('خطأ: '+(e.message||'فشل الحفظ'),'error');
    }
};

// ── تحويل بين الصندوقين ──
window.openTransferModal = function() {
    const body = `
    <div class="form-grid">
        <div class="form-field">
            <label class="form-label">من</label>
            <select class="form-select" id="xfFrom">
                <option value="bank">البنك</option>
                <option value="treasury">الخزينة</option>
            </select>
        </div>
        <div class="form-field">
            <label class="form-label">إلى</label>
            <select class="form-select" id="xfTo">
                <option value="treasury">الخزينة</option>
                <option value="bank">البنك</option>
            </select>
        </div>
        <div class="form-field full">
            <label class="form-label">المبلغ (ر.س) *</label>
            <input class="form-input" id="xfAmt" type="number" step="0.01" min="0.01" placeholder="0.00" autofocus>
        </div>
        <div class="form-field full">
            <label class="form-label">ملاحظات</label>
            <input class="form-input" id="xfNotes" placeholder="مثلاً: استقطاع أرباح الشهر">
        </div>
    </div>`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="saveTransfer()">تنفيذ التحويل</button>
    `;
    openModal('تحويل بين الصندوقين', body, foot);
};

window.saveTransfer = async function() {
    const { sb } = window.A;
    const from = document.getElementById('xfFrom').value;
    const to = document.getElementById('xfTo').value;
    const amt = parseFloat(document.getElementById('xfAmt').value) || 0;
    const notes = document.getElementById('xfNotes').value.trim() || null;

    if (from === to) { showToast('لا يمكن التحويل لنفس الحساب','error'); return; }
    if (!amt || amt <= 0) { showToast('أدخل مبلغاً صحيحاً','error'); return; }

    try {
        const { error } = await sb.from('finance_transfers').insert({
            from_account: from,
            to_account: to,
            amount: amt,
            notes
        });
        if (error) throw error;
        showToast('تم التحويل بنجاح','success');
        closeModal();
        loadFinance();
    } catch(e) {
        showToast('خطأ: '+(e.message||'فشل التحويل'),'error');
    }
};

// ── رسوم وسائل الدفع ──
window.openFeesModal = async function() {
    const { sb } = window.A;
    let fees = [];
    try {
        const { data } = await sb.from('payment_fees').select('*').order('payment_method');
        fees = data || [];
    } catch(e){}

    if (fees.length === 0) {
        // fallback: الافتراضيات
        fees = [
            { payment_method:'visa',      fee_percent:2.75, fee_fixed:1.00, label:'فيزا / ماستركارد' },
            { payment_method:'apple_pay', fee_percent:2.50, fee_fixed:0.00, label:'Apple Pay' },
            { payment_method:'mada',      fee_percent:1.00, fee_fixed:0.00, label:'مدى' },
            { payment_method:'stc_pay',   fee_percent:2.50, fee_fixed:0.00, label:'STC Pay' },
            { payment_method:'default',   fee_percent:2.75, fee_fixed:0.00, label:'افتراضي' }
        ];
    }

    const rows = fees.map(f => `
        <tr>
            <td style="padding:10px 6px">${esc(f.label || f.payment_method)}</td>
            <td style="padding:10px 6px"><input class="form-input" type="number" step="0.01" id="fee_${esc(f.payment_method)}_pct" value="${f.fee_percent}" style="width:90px;padding:6px 8px"> <small style="color:var(--i3)">%</small></td>
            <td style="padding:10px 6px"><input class="form-input" type="number" step="0.01" id="fee_${esc(f.payment_method)}_fx" value="${f.fee_fixed}" style="width:90px;padding:6px 8px"> <small style="color:var(--i3)">ر.س</small></td>
        </tr>
    `).join('');

    const body = `
    <div style="font-size:12px;color:var(--i3);margin-bottom:10px">الرسوم المخصومة من كل عملية دفع. تُستخدم لحساب الإيرادات الصافية ورصيد البنك.</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:2px solid var(--ln)">
            <th style="text-align:right;padding:8px 6px;font-size:11px;color:var(--i3)">وسيلة الدفع</th>
            <th style="text-align:right;padding:8px 6px;font-size:11px;color:var(--i3)">نسبة مئوية</th>
            <th style="text-align:right;padding:8px 6px;font-size:11px;color:var(--i3)">رسم ثابت</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <input type="hidden" id="feesMethodList" value="${fees.map(f => f.payment_method).join(',')}">`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="saveFees()">حفظ الرسوم</button>
    `;
    openModal('رسوم وسائل الدفع', body, foot);
};

window.saveFees = async function() {
    const { sb } = window.A;
    const methods = document.getElementById('feesMethodList').value.split(',').filter(Boolean);
    const labels = {
        visa:'فيزا / ماستركارد', apple_pay:'Apple Pay', mada:'مدى',
        stc_pay:'STC Pay', default:'افتراضي'
    };
    const rows = methods.map(m => ({
        payment_method: m,
        fee_percent: parseFloat(document.getElementById('fee_'+m+'_pct').value) || 0,
        fee_fixed: parseFloat(document.getElementById('fee_'+m+'_fx').value) || 0,
        label: labels[m] || m,
        updated_at: new Date().toISOString()
    }));
    try {
        const { error } = await sb.from('payment_fees').upsert(rows, { onConflict: 'payment_method' });
        if (error) throw error;
        showToast('حُفظت الرسوم','success');
        closeModal();
        loadFinance();
    } catch(e) {
        showToast('خطأ: '+(e.message||'فشل الحفظ'),'error');
    }
};

// ═══════════════════════════════════════════════════════
// 7B. INVOICES
// ═══════════════════════════════════════════════════════
window.loadInvoices = async function(page=1) {
    const { sb } = window.A;
    const PAGE_SIZE = 25;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
        <div style="font-size:14px;font-weight:700">الفواتير الضريبية</div>
        <div style="display:flex;gap:8px">
            <div class="search-box">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="search" id="invSearch" placeholder="بحث برقم الفاتورة/الاسم..." oninput="invSearchDebounce()">
            </div>
            <select class="form-select" id="invFilter" style="width:auto" onchange="loadInvoices(1)">
                <option value="paid">المدفوعة فقط</option>
                <option value="all">كل الفواتير</option>
                <option value="pending">معلقة</option>
            </select>
        </div>
    </div>
    <div class="card"><div class="tbl-wrap" id="invTable"><div class="loader">...</div></div></div>`;

    try {
        const search = (document.getElementById('invSearch')?.value||'').trim();
        const filter = document.getElementById('invFilter').value;

        let q = sb.from('invoices').select('*', {count:'exact'});
        if (filter === 'paid') q = q.eq('payment_status', 'paid');
        else if (filter === 'pending') q = q.eq('payment_status', 'pending');
        if (search) q = q.or('invoice_number.ilike.%'+search+'%,customer_name.ilike.%'+search+'%');

        const { data, count } = await q.order('created_at',{ascending:false}).range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1);
        const tbl = document.getElementById('invTable');
        if (!data || data.length === 0) {
            tbl.innerHTML = '<div class="empty"><div class="empty-ic">📄</div><div class="empty-t">لا فواتير</div></div>';
            return;
        }
        tbl.innerHTML = '<table><thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>الخطة</th><th>المبلغ قبل الضريبة</th><th>الضريبة 15%</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead><tbody>' +
            data.map(inv => {
                const status = inv.payment_status === 'paid' ? '<span class="status-pill active">مدفوعة</span>' : inv.payment_status === 'pending' ? '<span class="status-pill pending">معلقة</span>' : '<span class="status-pill expired">ملغاة</span>';
                return `<tr>
                    <td><b style="font-family:monospace;color:var(--pri)">${esc(inv.invoice_number)}</b></td>
                    <td class="td-name">${esc(inv.customer_name||'—')}${inv.customer_phone?'<div style="font-size:9px;color:var(--i4)">'+esc(inv.customer_phone)+'</div>':''}</td>
                    <td>${esc(inv.plan_name||'—')}</td>
                    <td class="td-muted">${fmt(Number(inv.amount_before_tax).toFixed(2))} ر.س</td>
                    <td class="td-muted">${fmt(Number(inv.tax_amount).toFixed(2))} ر.س</td>
                    <td><b>${fmt(Number(inv.total_amount).toFixed(2))} ر.س</b></td>
                    <td>${status}</td>
                    <td class="td-muted">${new Date(inv.created_at).toLocaleDateString('ar-SA')}</td>
                    <td><button class="q-act-btn" onclick='downloadInvoicePDF("${inv.id}")' title="تنزيل PDF"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button></td>
                </tr>`;
            }).join('') + '</tbody></table>';
        const totalPages = Math.ceil((count||0)/PAGE_SIZE);
        if (totalPages > 1) {
            tbl.innerHTML += '<div class="pagination" style="padding:14px"><div class="pg-info">'+fmt(count)+' فاتورة · صفحة '+page+'/'+totalPages+'</div><div class="pg-btns"><button class="pg-btn" '+(page<=1?'disabled':'')+' onclick="loadInvoices('+(page-1)+')"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button><button class="pg-btn" '+(page>=totalPages?'disabled':'')+' onclick="loadInvoices('+(page+1)+')"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button></div></div>';
        }
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};
let invSearchTimer;
window.invSearchDebounce = function() { clearTimeout(invSearchTimer); invSearchTimer = setTimeout(()=>loadInvoices(1), 400); };

window.downloadInvoicePDF = async function(id) {
    try {
        // فتح صفحة الفاتورة v2 القابلة للطباعة (PDF عبر المتصفح)
        const url = 'invoice-v2.html?id=' + encodeURIComponent(id);
        window.open(url, '_blank');
        showToast('تم فتح الفاتورة — استخدم طباعة/حفظ PDF','suc');
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// 7C. EXPENSES
// ═══════════════════════════════════════════════════════
window.loadExpenses = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">المصروفات</div>
        <button class="btn btn-pri" onclick="openExpenseModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>مصروف جديد</button>
    </div>
    <div id="expSummary" class="finance-summary"><div class="loader">...</div></div>
    <div class="card"><div class="tbl-wrap" id="expTable"><div class="loader">...</div></div></div>`;

    try {
        const { data } = await sb.from('expenses').select('*').order('expense_date',{ascending:false}).limit(200);
        const total = (data||[]).reduce((s,e)=>s+Number(e.amount||0),0);
        const thisMonth = (data||[]).filter(e => new Date(e.expense_date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((s,e)=>s+Number(e.amount||0),0);
        const byCategory = {};
        (data||[]).forEach(e => byCategory[e.category] = (byCategory[e.category]||0) + Number(e.amount||0));
        const topCat = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0];

        document.getElementById('expSummary').innerHTML = `
            <div class="fs-card exp"><div class="fs-label">إجمالي المصروفات</div><div class="fs-val">${fmt(Math.round(total))}</div><div class="fs-sub">${(data||[]).length} مصروف</div></div>
            <div class="fs-card exp"><div class="fs-label">هذا الشهر</div><div class="fs-val">${fmt(Math.round(thisMonth))}</div><div class="fs-sub">ريال سعودي</div></div>
            <div class="fs-card exp"><div class="fs-label">أعلى فئة</div><div class="fs-val" style="font-size:18px">${topCat?esc(categoryName(topCat[0])):'—'}</div><div class="fs-sub">${topCat?fmt(Math.round(topCat[1]))+' ريال':'—'}</div></div>`;

        const tbl = document.getElementById('expTable');
        if (!data || data.length === 0) {
            tbl.innerHTML = '<div class="empty"><div class="empty-ic">💸</div><div class="empty-t">لا مصروفات مسجلة</div><div class="empty-d">أضف أول مصروف لتتبع التكاليف</div></div>';
            return;
        }
        tbl.innerHTML = '<table><thead><tr><th>العنوان</th><th>الفئة</th><th>المبلغ</th><th>التاريخ</th><th></th></tr></thead><tbody>' +
            data.map(e => `<tr>
                <td><div class="td-name">${esc(e.title)}</div>${e.description?'<div style="font-size:10px;color:var(--i4);margin-top:2px">'+esc(e.description)+'</div>':''}</td>
                <td><span class="status-pill" style="background:var(--s2);color:var(--i2)">${esc(categoryName(e.category))}</span></td>
                <td><b style="color:var(--dng)">-${fmt(Number(e.amount).toFixed(2))} ر.س</b></td>
                <td class="td-muted">${new Date(e.expense_date).toLocaleDateString('ar-SA')}</td>
                <td><div style="display:flex;gap:4px"><button class="q-act-btn" onclick='editExpense("${e.id}")'><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="q-act-btn" onclick='deleteExpense("${e.id}")'><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button></div></td>
            </tr>`).join('') + '</tbody></table>';
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

function categoryName(c) {
    return { general:'عام', marketing:'تسويق', tools:'أدوات', salaries:'رواتب', infrastructure:'بنية تحتية', other:'أخرى' }[c] || c || 'عام';
}

window.openExpenseModal = function(existing) {
    const d = existing || { title:'', description:'', amount:0, category:'general', expense_date:new Date().toISOString().split('T')[0] };
    const cats = ['general','marketing','tools','salaries','infrastructure','other'];
    const body = `
    <div class="form-grid">
        <div class="form-field full"><label class="form-label">العنوان *</label><input class="form-input" id="exTitle" value="${esc(d.title)}" placeholder="مثلاً: اشتراك Supabase Pro"></div>
        <div class="form-field"><label class="form-label">المبلغ (ريال) *</label><input class="form-input" type="number" step="0.01" id="exAmount" value="${d.amount||''}" placeholder="25.00"></div>
        <div class="form-field"><label class="form-label">الفئة</label><select class="form-select" id="exCategory">${cats.map(c=>'<option value="'+c+'" '+(d.category===c?'selected':'')+'>'+categoryName(c)+'</option>').join('')}</select></div>
        <div class="form-field full"><label class="form-label">التاريخ</label><input class="form-input" type="date" id="exDate" value="${d.expense_date?d.expense_date.split('T')[0]:''}"></div>
        <div class="form-field full"><label class="form-label">الوصف (اختياري)</label><textarea class="form-textarea" id="exDesc">${esc(d.description||'')}</textarea></div>
    </div>`;
    openModal(existing?'تعديل مصروف':'مصروف جديد', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="saveExpense('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
};

window.saveExpense = async function(id) {
    const { sb, profile } = window.A;
    const data = {
        title: document.getElementById('exTitle').value.trim(),
        description: document.getElementById('exDesc').value.trim() || null,
        amount: parseFloat(document.getElementById('exAmount').value) || 0,
        category: document.getElementById('exCategory').value,
        expense_date: document.getElementById('exDate').value || new Date().toISOString().split('T')[0]
    };
    if (!data.title) return showToast('العنوان مطلوب','err');
    if (data.amount <= 0) return showToast('المبلغ يجب أن يكون أكبر من صفر','err');

    if (!id && profile?.id) data.created_by = profile.id;

    try {
        let result;
        if (id) result = await sb.from('expenses').update(data).eq('id', id).select();
        else result = await sb.from('expenses').insert(data).select();

        if (result.error) {
            showToast('خطأ في الحفظ: ' + result.error.message, 'err');
            return;
        }
        showToast('تم الحفظ','suc');
        closeModal();
        loadExpenses();
    } catch(e) {
        showToast('خطأ: ' + (e.message || 'غير معروف'), 'err');
    }
};

window.editExpense = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('expenses').select('*').eq('id', id).single();
    if (data) openExpenseModal(data);
};

window.deleteExpense = async function(id) {
    if (!confirm('حذف المصروف؟')) return;
    const { sb } = window.A;
    await sb.from('expenses').delete().eq('id', id);
    showToast('تم الحذف','suc');
    loadExpenses();
};

// ═══════════════════════════════════════════════════════
// 8. BANNERS
// ═══════════════════════════════════════════════════════
window.loadBanners = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="bannersArea"><div class="loader">جاري التحميل...</div></div>';
    try {
        const { data } = await sb.from('banners').select('*').order('sort_order');
        const banners = data || [];
        const getB = type => banners.find(b => b.banner_type === type) || { banner_type:type, is_active:false, config:{}, target_pages:['dashboard'] };
        const tk = getB('ticker'), img = getB('image'), mn = getB('main');

        // target_pages helper → اختيار واحد من 4
        const tgtValue = b => {
            const t = Array.isArray(b.target_pages) ? b.target_pages : ['dashboard'];
            if (t.includes('all')) return 'all';
            if (t.includes('leaks') && t.includes('dashboard')) return 'dashboard+leaks';
            if (t.includes('leaks')) return 'leaks';
            return 'dashboard';
        };
        const tgtSelect = (id, cur) => `
            <div class="form-field full" style="margin-top:8px"><label class="form-label">يظهر في</label>
                <select class="form-select" id="${id}">
                    <option value="dashboard" ${cur==='dashboard'?'selected':''}>الرئيسية فقط</option>
                    <option value="leaks" ${cur==='leaks'?'selected':''}>التسريبات فقط</option>
                    <option value="dashboard+leaks" ${cur==='dashboard+leaks'?'selected':''}>الرئيسية + التسريبات</option>
                    <option value="all" ${cur==='all'?'selected':''}>كل صفحات التطبيق</option>
                </select>
            </div>`;

        document.getElementById('bannersArea').innerHTML = `
        <!-- TICKER -->
        <div class="banner-form">
            <div class="banner-form-top"><div class="banner-form-title">🎯 الشريط المتحرك <span class="banner-status ${tk.is_active?'live':'off'}">${tk.is_active?'مفعّل':'معطّل'}</span></div>
                <label class="toggle2 ${tk.is_active?'on':''}" id="tkToggle" onclick="toggleBanner('ticker',this)"></label>
            </div>
            <div class="banner-preview"><div class="ticker-preview" style="background:${esc(tk.config.bg_color||'#6D5DF6')};color:${esc(tk.config.text_color||'#fff')}">
                ${tk.config.keyword?'<span style="font-weight:700;margin-left:6px;color:'+esc(tk.config.keyword_color||'#FFD700')+'">'+esc(tk.config.keyword)+'</span>':''}${esc(tk.config.text||'نص الشريط')}
            </div></div>
            <div class="form-grid">
                <div class="form-field full">
                    <label class="form-label">الكلمة المميزة ولونها</label>
                    <div class="field-inline">
                        <input class="form-input" id="tk_keyword" value="${esc(tk.config.keyword||'')}" placeholder="مثلاً: جديد">
                        <input class="form-input color-pick" type="color" id="tk_keyword_color" value="${esc(tk.config.keyword_color||'#FF6B35')}" title="لون الكلمة">
                    </div>
                </div>
                <div class="form-field full">
                    <label class="form-label">نص الشريط ولونه</label>
                    <div class="field-inline">
                        <input class="form-input" id="tk_text" value="${esc(tk.config.text||'')}" placeholder="نص الإعلان...">
                        <input class="form-input color-pick" type="color" id="tk_text_color" value="${esc(tk.config.text_color||'#ffffff')}" title="لون النص">
                    </div>
                </div>
                <div class="form-field full">
                    <label class="form-label">لون خلفية الشريط</label>
                    <div class="field-inline">
                        <input class="form-input color-pick" type="color" id="tk_bg_color" value="${esc(tk.config.bg_color||'#6D5DF6')}" style="width:60px">
                        <span style="flex:1;font-size:11px;color:var(--i3);align-self:center;padding-right:6px">اختر خلفية الشريط المتحرك</span>
                    </div>
                </div>
                <div class="form-field full"><label class="form-label">سرعة الحركة: <span id="tk_speed_v">${tk.config.speed||50}</span></label><input type="range" id="tk_speed" min="10" max="100" value="${tk.config.speed||50}" oninput="document.getElementById('tk_speed_v').textContent=this.value"></div>
                ${tgtSelect('tk_target', tgtValue(tk))}
            </div>
            <button class="btn btn-pri" style="margin-top:12px" onclick='saveBanner("ticker")'>حفظ</button>
        </div>

        <!-- MAIN BANNER -->
        <div class="banner-form">
            <div class="banner-form-top"><div class="banner-form-title">🎪 البنر الرئيسي <span class="banner-status ${mn.is_active?'live':'off'}">${mn.is_active?'مفعّل':'معطّل'}</span> <span class="banner-pos">${(mn.sort_order||0) < (img.sort_order||0) ? '⬆ أعلى' : '⬇ أسفل'}</span></div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="swapBannerOrder()" title="تبديل الترتيب مع بنر الصورة">↕ تبديل الترتيب</button>
                    <label class="toggle2 ${mn.is_active?'on':''}" onclick="toggleBanner('main',this)"></label>
                </div>
            </div>
            <div class="banner-preview"><div class="banner-block" style="background:linear-gradient(135deg,${esc(mn.config.bg_left||'#1A1230')},${esc(mn.config.bg_right||'#2D1B69')})">
                <div class="banner-block-info">
                    <div class="tag">${esc(mn.config.tag||'')}</div>
                    <div class="title">${esc(mn.config.title||'عنوان')}</div>
                    <div class="sub">${esc(mn.config.subtitle||'')}</div>
                    <button class="banner-block-btn" style="background:${esc(mn.config.btn_color||'#FFD700')};color:${esc(mn.config.btn_text_color||'#1A1230')}">${esc(mn.config.cta_text||'انقر')}</button>
                </div>
            </div></div>
            <div class="form-grid">
                <div class="form-field full"><label class="form-label">التاغ (ملصق صغير فوق العنوان)</label><input class="form-input" id="mn_tag" value="${esc(mn.config.tag||'')}" placeholder="مثلاً: اختبار محاكي"></div>
                <div class="form-field full"><label class="form-label">العنوان الرئيسي</label><input class="form-input" id="mn_title" value="${esc(mn.config.title||'')}" placeholder="السبت القادم — القدرات"></div>
                <div class="form-field full"><label class="form-label">النص التوضيحي</label><input class="form-input" id="mn_subtitle" value="${esc(mn.config.subtitle||'')}" placeholder="وصف مختصر..."></div>

                <div class="form-field full">
                    <label class="form-label">نص الزر ولونه ولون الخط</label>
                    <div class="field-inline">
                        <input class="form-input" id="mn_cta_text" value="${esc(mn.config.cta_text||'')}" placeholder="سجّل مشاركتي">
                        <input class="form-input color-pick" type="color" id="mn_btn_color" value="${esc(mn.config.btn_color||'#FFD700')}" title="لون الزر">
                        <input class="form-input color-pick" type="color" id="mn_btn_text_color" value="${esc(mn.config.btn_text_color||'#1A1230')}" title="لون نص الزر">
                    </div>
                </div>

                <div class="form-field full">
                    <label class="form-label">تدرّج الخلفية (يسار ← يمين)</label>
                    <div class="field-inline">
                        <input class="form-input color-pick" type="color" id="mn_bg_left" value="${esc(mn.config.bg_left||'#1A1230')}" title="لون يسار">
                        <input class="form-input color-pick" type="color" id="mn_bg_right" value="${esc(mn.config.bg_right||'#2D1B69')}" title="لون يمين">
                        <span style="flex:1;font-size:11px;color:var(--i3);align-self:center;padding-right:6px">اختر لونين متدرّجين</span>
                    </div>
                </div>

                ${tgtSelect('mn_target', tgtValue(mn))}
            </div>
            <button class="btn btn-pri" style="margin-top:12px" onclick='saveBanner("main")'>حفظ</button>
        </div>

        <!-- IMAGE BANNER -->
        <div class="banner-form">
            <div class="banner-form-top"><div class="banner-form-title">🖼️ بنر الصورة <span class="banner-status ${img.is_active?'live':'off'}">${img.is_active?'مفعّل':'معطّل'}</span> <span class="banner-pos">${(img.sort_order||0) < (mn.sort_order||0) ? '⬆ أعلى' : '⬇ أسفل'}</span></div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="swapBannerOrder()" title="تبديل الترتيب مع البنر الرئيسي">↕ تبديل الترتيب</button>
                    <label class="toggle2 ${img.is_active?'on':''}" onclick="toggleBanner('image',this)"></label>
                </div>
            </div>

            <!-- معاينة مباشرة -->
            <div class="banner-preview" style="background:var(--s2);padding:10px;display:flex;align-items:center;justify-content:center;min-height:140px">
                <img id="img_preview" src="${esc(img.config.image_url||'https://via.placeholder.com/1200x400/6D5DF6/ffffff?text=%D8%B5%D9%88%D8%B1%D8%A9+%D8%A7%D9%84%D8%A8%D9%86%D8%B1+1200x400')}" style="max-width:100%;border-radius:10px;max-height:200px" onerror="this.src='https://via.placeholder.com/1200x400/6D5DF6/ffffff?text=%D8%B5%D9%88%D8%B1%D8%A9+%D8%A7%D9%84%D8%A8%D9%86%D8%B1+1200x400'">
            </div>

            <!-- خياران: رفع ملف + لصق URL -->
            <div class="form-field full">
                <label class="form-label">صورة البنر (1200×400 موصى به)</label>
                <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
                    <button type="button" class="btn btn-ghost" onclick="document.getElementById('img_file').click()">
                        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        رفع ملف
                    </button>
                    <input type="file" id="img_file" accept="image/*" style="display:none" onchange="uploadBannerImage(this)">
                    <span style="font-size:11px;color:var(--i4)">أو</span>
                    <input class="form-input" id="img_url" type="url" placeholder="لصق رابط الصورة (URL)" value="${esc(img.config.image_url||'')}" style="flex:1" oninput="refreshBannerImagePreview()">
                </div>
                <div style="font-size:10px;color:var(--i4)">الصيغ: JPG/PNG/WebP · الحد الأقصى: 2MB</div>
            </div>

            <!-- رابط الضغط -->
            <div class="form-grid" style="margin-top:10px">
                <div class="form-field">
                    <label class="form-label">نوع الرابط عند الضغط</label>
                    <select class="form-select" id="img_link_type" onchange="toggleLinkFields()">
                        <option value="none" ${!img.config.link_type||img.config.link_type==='none'?'selected':''}>بدون رابط</option>
                        <option value="internal" ${img.config.link_type==='internal'?'selected':''}>داخلي (صفحة في التطبيق)</option>
                        <option value="external" ${img.config.link_type==='external'?'selected':''}>خارجي (URL)</option>
                    </select>
                </div>
                <div class="form-field" id="img_internal_wrap" style="${img.config.link_type==='internal'?'':'display:none'}">
                    <label class="form-label">الصفحة الداخلية</label>
                    <select class="form-select" id="img_internal">
                        <option value="leaks-v2.html" ${img.config.link==='leaks-v2.html'?'selected':''}>التسريبات</option>
                        <option value="training-v2.html" ${img.config.link==='training-v2.html'?'selected':''}>التدريب</option>
                        <option value="reports-v2.html" ${img.config.link==='reports-v2.html'?'selected':''}>التقارير</option>
                        <option value="../pricing.html" ${img.config.link==='../pricing.html'?'selected':''}>الاشتراك</option>
                        <option value="profile-v2.html" ${img.config.link==='profile-v2.html'?'selected':''}>الملف الشخصي</option>
                    </select>
                </div>
                <div class="form-field full" id="img_external_wrap" style="${img.config.link_type==='external'?'':'display:none'}">
                    <label class="form-label">الرابط الخارجي</label>
                    <input class="form-input" id="img_external" type="url" value="${esc(img.config.link&&img.config.link_type==='external'?img.config.link:'')}" placeholder="https://example.com">
                </div>
                ${tgtSelect('img_target', tgtValue(img))}
            </div>

            <button class="btn btn-pri" style="margin-top:12px" onclick='saveBanner("image")'>حفظ</button>
        </div>`;
    } catch(e) { showToast('خطأ','err'); }
};

window.refreshBannerImagePreview = function() {
    const url = (document.getElementById('img_url')?.value || '').trim();
    const prev = document.getElementById('img_preview');
    if (!prev) return;
    prev.src = url || 'https://via.placeholder.com/1200x400/6D5DF6/ffffff?text=%D8%B5%D9%88%D8%B1%D8%A9+%D8%A7%D9%84%D8%A8%D9%86%D8%B1+1200x400';
};

window.uploadBannerImage = async function(input) {
    const { sb } = window.A;
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('الملف أكبر من 2MB','err'); return; }
    if (!/^image\//.test(file.type)) { showToast('يرجى اختيار صورة','err'); return; }

    // كشف وضع المعاينة (Mock) → استخدم FileReader كبديل عن الرفع
    const isPreview = new URLSearchParams(window.location.search).has('preview');

    showToast('جاري الرفع...','');
    try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = 'banners/' + Date.now() + '-' + Math.random().toString(36).substr(2,8) + '.' + ext;
        const { error } = await sb.storage.from('question-images').upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
            // في وضع المعاينة: احفظ كـ data URL محلي للمعاينة المباشرة
            if (isPreview) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    document.getElementById('img_url').value = ev.target.result;
                    refreshBannerImagePreview();
                    showToast('معاينة محلية (بدون رفع — وضع المعاينة)','suc');
                };
                reader.readAsDataURL(file);
                return;
            }
            showToast('خطأ في الرفع: ' + error.message, 'err');
            return;
        }
        const { data } = sb.storage.from('question-images').getPublicUrl(path);
        document.getElementById('img_url').value = data.publicUrl;
        refreshBannerImagePreview();
        showToast('تم رفع الصورة','suc');
    } catch(e) {
        showToast('خطأ: ' + e.message, 'err');
    } finally {
        input.value = '';
    }
};

window.toggleLinkFields = function() {
    const type = document.getElementById('img_link_type').value;
    const intWrap = document.getElementById('img_internal_wrap');
    const extWrap = document.getElementById('img_external_wrap');
    if (intWrap) intWrap.style.display = type === 'internal' ? '' : 'none';
    if (extWrap) extWrap.style.display = type === 'external' ? '' : 'none';
};

window.swapBannerOrder = async function() {
    const { sb } = window.A;
    try {
        const { data } = await sb.from('banners').select('banner_type,sort_order').in('banner_type', ['main','image']);
        if (!data || data.length < 2) { showToast('لا يمكن التبديل','err'); return; }
        const mn = data.find(b => b.banner_type === 'main');
        const im = data.find(b => b.banner_type === 'image');
        await sb.from('banners').update({sort_order: im.sort_order}).eq('banner_type','main');
        await sb.from('banners').update({sort_order: mn.sort_order}).eq('banner_type','image');
        showToast('تم تبديل الترتيب','suc');
        loadBanners();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.toggleBanner = async function(type, el) {
    const { sb } = window.A;
    el.classList.toggle('on');
    const active = el.classList.contains('on');
    try {
        await sb.from('banners').update({is_active:active}).eq('banner_type', type);
        showToast((active?'تم تفعيل ':'تم إيقاف ')+type,'suc');
    } catch(e) { showToast('خطأ','err'); }
};

window.saveBanner = async function(type) {
    const { sb } = window.A;
    let config = {};
    let targetSelectId = null;
    if (type === 'ticker') {
        config = {
            keyword: document.getElementById('tk_keyword').value,
            keyword_color: document.getElementById('tk_keyword_color').value,
            text: document.getElementById('tk_text').value,
            bg_color: document.getElementById('tk_bg_color').value,
            text_color: document.getElementById('tk_text_color').value,
            speed: parseInt(document.getElementById('tk_speed').value)
        };
        targetSelectId = 'tk_target';
    } else if (type === 'main') {
        config = {
            tag: document.getElementById('mn_tag').value,
            cta_text: document.getElementById('mn_cta_text').value,
            title: document.getElementById('mn_title').value,
            subtitle: document.getElementById('mn_subtitle').value,
            bg_left: document.getElementById('mn_bg_left').value,
            bg_right: document.getElementById('mn_bg_right').value,
            btn_color: document.getElementById('mn_btn_color').value,
            btn_text_color: document.getElementById('mn_btn_text_color').value
        };
        targetSelectId = 'mn_target';
    } else if (type === 'image') {
        const linkType = document.getElementById('img_link_type').value;
        let link = null;
        if (linkType === 'internal') link = document.getElementById('img_internal').value;
        else if (linkType === 'external') link = document.getElementById('img_external').value.trim();
        config = {
            image_url: document.getElementById('img_url').value.trim(),
            link_type: linkType,
            link: link || null
        };
        targetSelectId = 'img_target';
    }

    // Build target_pages array from dropdown selection
    const targetMap = {
        dashboard: ['dashboard'],
        leaks: ['leaks'],
        'dashboard+leaks': ['dashboard','leaks'],
        all: ['all']
    };
    const sel = targetSelectId ? document.getElementById(targetSelectId) : null;
    const target_pages = sel ? (targetMap[sel.value] || ['dashboard']) : ['dashboard'];

    try {
        // أول محاولة: حفظ مع target_pages (يتطلب تشغيل Migration 13)
        const { error } = await sb.from('banners').update({ config, target_pages }).eq('banner_type', type);
        if (error && /target_pages/i.test(error.message || '')) {
            // العمود غير موجود بعد — احفظ config فقط واعرض تنبيه
            await sb.from('banners').update({ config }).eq('banner_type', type);
            showToast('حُفظ بدون "يظهر في" — شغّل Migration 13 في Supabase','err');
        } else if (error) {
            throw error;
        } else {
            showToast('تم الحفظ','suc');
        }
        loadBanners();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// 9. PAGES
// ═══════════════════════════════════════════════════════
window.loadPages = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">الصفحات التعريفية</div>
        <button class="btn btn-pri" onclick="openPageModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>صفحة جديدة</button>
    </div>
    <div id="pagesList"><div class="loader">...</div></div>`;
    try {
        const { data } = await sb.from('pages').select('*').order('updated_at',{ascending:false});
        const list = document.getElementById('pagesList');
        if (!data || data.length === 0) { list.innerHTML = '<div class="empty"><div class="empty-ic">📄</div><div class="empty-t">لا صفحات</div></div>'; return; }
        list.innerHTML = data.map(p => `
            <div class="card" style="padding:16px 18px;margin-bottom:10px;display:flex;align-items:center;gap:14px;cursor:pointer" onclick='editPage("${p.id}")'>
                ${p.logo_url?'<img src="'+esc(p.logo_url)+'" style="width:36px;height:36px;border-radius:10px" onerror="this.style.display=\'none\'">':'<div style="width:36px;height:36px;border-radius:10px;background:var(--pri-s);display:grid;place-items:center"><svg width="16" height="16" fill="none" stroke="var(--pri)" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>'}
                <div style="flex:1"><div style="font-size:13px;font-weight:700">${esc(p.title)}</div><div style="font-size:10px;color:var(--i3)">${esc(p.description||p.slug)}</div></div>
                <div style="font-size:10px;color:var(--i4)">${new Date(p.updated_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</div>
            </div>`).join('');
    } catch(e) { showToast('خطأ','err'); }
};

window.openPageModal = function(existing) {
    const d = existing || { slug:'', title:'', description:'', content:'', logo_url:'' };
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">العنوان</label><input class="form-input" id="pgTitle" value="${esc(d.title)}"></div>
        <div class="form-field"><label class="form-label">المعرف (slug)</label><input class="form-input" id="pgSlug" value="${esc(d.slug)}" ${existing?'readonly':''}></div>
        <div class="form-field full"><label class="form-label">الوصف</label><input class="form-input" id="pgDesc" value="${esc(d.description||'')}"></div>
        <div class="form-field full"><label class="form-label">رابط الشعار</label><input class="form-input" id="pgLogo" type="url" value="${esc(d.logo_url||'')}" placeholder="https://..."></div>
        <div class="form-field full"><label class="form-label">المحتوى (HTML)</label><textarea class="form-textarea" id="pgContent" style="min-height:200px;font-family:monospace">${esc(d.content||'')}</textarea></div>
    </div>`;
    openModal(existing?'تعديل صفحة':'صفحة جديدة', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="savePage('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
};

window.savePage = async function(id) {
    const { sb } = window.A;
    const data = {
        title: document.getElementById('pgTitle').value.trim(),
        slug: document.getElementById('pgSlug').value.trim(),
        description: document.getElementById('pgDesc').value.trim() || null,
        logo_url: document.getElementById('pgLogo').value.trim() || null,
        content: document.getElementById('pgContent').value,
        updated_at: new Date().toISOString()
    };
    if (!data.title || !data.slug) return showToast('العنوان والمعرف مطلوبان','err');
    try {
        if (id) await sb.from('pages').update(data).eq('id', id);
        else await sb.from('pages').insert(data);
        showToast('تم الحفظ','suc');
        closeModal();
        loadPages();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editPage = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('pages').select('*').eq('id', id).single();
    if (data) openPageModal(data);
};

// ═══════════════════════════════════════════════════════
// 10. REFERRALS
// ═══════════════════════════════════════════════════════
window.loadReferrals = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="refArea"><div class="loader">...</div></div>';
    try {
        const [totalR, subR, daysR] = await Promise.all([
            sb.from('referrals').select('*',{count:'exact',head:true}),
            sb.from('referrals').select('*',{count:'exact',head:true}).eq('referred_status','subscribed'),
            sb.from('referrals').select('bonus_days')
        ]);
        const totalDays = (daysR.data||[]).reduce((s,r)=>s+Number(r.bonus_days||0),0);
        const conversionRate = totalR.count > 0 ? Math.round((subR.count||0)/totalR.count*100) : 0;

        document.getElementById('refArea').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
            <div class="kpi blue"><div class="kpi-label">إجمالي الإحالات</div><div class="kpi-val">${fmt(totalR.count||0)}</div><div class="kpi-sub">رابط إحالة</div></div>
            <div class="kpi green"><div class="kpi-label">سجلوا عبر الإحالة</div><div class="kpi-val">${fmt(totalR.count||0)}</div><div class="kpi-sub">مستخدم</div></div>
            <div class="kpi orange"><div class="kpi-label">اشتركوا</div><div class="kpi-val">${fmt(subR.count||0)}</div><div class="kpi-sub">نسبة التحويل ${conversionRate}%</div></div>
            <div class="kpi gold"><div class="kpi-label">أيام مكتسبة</div><div class="kpi-val">${fmt(totalDays)}</div><div class="kpi-sub">يوم للمُحيلين</div></div>
        </div>

        <div class="card"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div><div class="card-title">الإحالات حسب المستخدم</div></div></div></div>
            <div class="tbl-wrap" id="refTable"><div class="loader">...</div></div></div>`;

        const { data: refs } = await sb.from('referrals').select('referrer_id, bonus_days, referred_status, profiles!referrals_referrer_id_fkey(full_name,referral_code)').limit(200);
        const byUser = {};
        (refs||[]).forEach(r => {
            const k = r.referrer_id;
            if (!byUser[k]) byUser[k] = { referrer: r.profiles, total:0, subscribed:0, days:0 };
            byUser[k].total++;
            if (r.referred_status === 'subscribed') byUser[k].subscribed++;
            byUser[k].days += Number(r.bonus_days||0);
        });
        const rows = Object.values(byUser).sort((a,b)=>b.subscribed-a.subscribed);
        const tbl = document.getElementById('refTable');
        if (rows.length === 0) { tbl.innerHTML = '<div class="empty-d">لا إحالات بعد</div>'; return; }
        tbl.innerHTML = '<table><thead><tr><th>الكود</th><th>المُحيل</th><th>سجلوا</th><th>اشتركوا</th><th>الأيام</th></tr></thead><tbody>' +
            rows.map(r => `<tr>
                <td><b style="color:var(--pri);letter-spacing:1px;font-family:monospace">${esc(r.referrer?.referral_code||'—')}</b></td>
                <td><div style="display:flex;align-items:center;gap:8px"><div class="tbl-avatar">${esc((r.referrer?.full_name||'?').charAt(0))}</div><div class="td-name">${esc(r.referrer?.full_name||'—')}</div></div></td>
                <td>${r.total}</td>
                <td><b style="color:var(--suc)">${r.subscribed}</b></td>
                <td><b style="color:var(--acc)">+${r.days}</b></td>
            </tr>`).join('') + '</tbody></table>';
    } catch(e) { showToast('خطأ','err'); }
};

// ═══════════════════════════════════════════════════════
// 11. TIPS
// ═══════════════════════════════════════════════════════
window.loadTips = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">النصائح اليومية</div>
        <button class="btn btn-pri" onclick="openTipModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>نصيحة جديدة</button>
    </div>
    <div id="tipsList"><div class="loader">...</div></div>`;
    try {
        const { data } = await sb.from('tips').select('*').order('sort_order');
        const list = document.getElementById('tipsList');
        if (!data || data.length === 0) { list.innerHTML = '<div class="empty"><div class="empty-ic">💡</div><div class="empty-t">لا نصائح</div></div>'; return; }
        list.innerHTML = data.map(t => `
            <div class="tip-manage-item">
                <div class="tip-manage-body"><div class="tip-manage-title">${t.emoji||'💡'} ${esc(t.title)}</div><div class="tip-manage-txt">${esc(t.body)}</div></div>
                <div class="tip-manage-actions">
                    <button class="q-act-btn" onclick='editTip("${t.id}")'><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="q-act-btn" onclick='deleteTip("${t.id}")'><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
                </div>
            </div>`).join('');
    } catch(e) { showToast('خطأ','err'); }
};

window.openTipModal = function(existing) {
    const d = existing || { emoji:'💡', title:'', body:'', sort_order:0, is_active:true };
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">إيموجي</label><input class="form-input" id="tpEmoji" value="${esc(d.emoji)}" maxlength="4"></div>
        <div class="form-field"><label class="form-label">الترتيب</label><input class="form-input" type="number" id="tpOrder" value="${d.sort_order||0}"></div>
        <div class="form-field full"><label class="form-label">العنوان</label><input class="form-input" id="tpTitle" value="${esc(d.title)}"></div>
        <div class="form-field full"><label class="form-label">النص</label><textarea class="form-textarea" id="tpBody">${esc(d.body)}</textarea></div>
        <div class="form-field"><label><input type="checkbox" id="tpActive" ${d.is_active!==false?'checked':''}> فعّالة</label></div>
    </div>`;
    openModal(existing?'تعديل نصيحة':'نصيحة جديدة', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="saveTip('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
};

window.saveTip = async function(id) {
    const { sb } = window.A;
    const data = {
        emoji: document.getElementById('tpEmoji').value,
        title: document.getElementById('tpTitle').value.trim(),
        body: document.getElementById('tpBody').value.trim(),
        sort_order: parseInt(document.getElementById('tpOrder').value) || 0,
        is_active: document.getElementById('tpActive').checked
    };
    if (!data.title || !data.body) return showToast('العنوان والنص مطلوبان','err');
    try {
        if (id) await sb.from('tips').update(data).eq('id', id);
        else await sb.from('tips').insert(data);
        showToast('تم الحفظ','suc');
        closeModal();
        loadTips();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editTip = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('tips').select('*').eq('id', id).single();
    if (data) openTipModal(data);
};

window.deleteTip = async function(id) {
    if (!confirm('حذف النصيحة؟')) return;
    const { sb } = window.A;
    await sb.from('tips').delete().eq('id', id);
    showToast('تم الحذف','suc');
    loadTips();
};

// ═══════════════════════════════════════════════════════
// 12. SEO
// ═══════════════════════════════════════════════════════
window.loadSEO = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="seoArea"><div class="loader">...</div></div>';
    try {
        const { data } = await sb.from('seo_settings').select('*').limit(1).single();
        const s = data || {};
        document.getElementById('seoArea').innerHTML = `
        <div class="row c2">
            <div class="card"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div><div class="card-title">إعدادات SEO</div></div></div></div>
            <div class="card-body">
                <div class="form-field"><label class="form-label">عنوان الصفحة (Title Tag)</label><input class="form-input" id="seoTitle" value="${esc(s.title_tag||'')}" oninput="updateSeoPreview()"></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">الوصف (Meta Description)</label><textarea class="form-textarea" id="seoDesc" oninput="updateSeoPreview()">${esc(s.meta_description||'')}</textarea></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">الكلمات المفتاحية</label><input class="form-input" id="seoKeywords" value="${esc(s.keywords||'')}"></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">عنوان OG</label><input class="form-input" id="seoOgTitle" value="${esc(s.og_title||'')}"></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">وصف OG</label><input class="form-input" id="seoOgDesc" value="${esc(s.og_description||'')}"></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">صورة OG (1200x630)</label><input class="form-input" id="seoOgImg" value="${esc(s.og_image_url||'')}" placeholder="https://..."></div>
                <button class="btn btn-pri" style="margin-top:14px" onclick='saveSEO(${data?'"'+data.id+'"':'null'})'>حفظ</button>
            </div></div>

            <div class="card"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic grn"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg></div><div><div class="card-title">معاينة Google</div></div></div></div>
            <div class="card-body">
                <div class="seo-preview" id="seoPreview">
                    <div class="seo-url">madarek-elite.com</div>
                    <div class="seo-title-p" id="seoPrevTitle">${esc(s.title_tag||'مدارك النخبة')}</div>
                    <div class="seo-desc-p" id="seoPrevDesc">${esc(s.meta_description||'تدريب الرخصة المهنية بذكاء')}</div>
                </div>
                <div style="font-size:11px;color:var(--i3);margin-top:16px">
                    <div style="font-weight:700;margin-bottom:8px">نصائح ASO:</div>
                    <div style="line-height:1.8">• استخدم كلمات بحثية شائعة<br>• العنوان الأقصى 60 حرف<br>• الوصف بين 150-160 حرف<br>• صورة OG بحجم 1200x630</div>
                </div>
            </div></div>
        </div>`;
    } catch(e) { showToast('خطأ','err'); }
};

window.updateSeoPreview = function() {
    document.getElementById('seoPrevTitle').textContent = document.getElementById('seoTitle').value || 'مدارك النخبة';
    document.getElementById('seoPrevDesc').textContent = document.getElementById('seoDesc').value || 'تدريب الرخصة المهنية';
};

window.saveSEO = async function(id) {
    const { sb } = window.A;
    const data = {
        title_tag: document.getElementById('seoTitle').value,
        meta_description: document.getElementById('seoDesc').value,
        keywords: document.getElementById('seoKeywords').value,
        og_title: document.getElementById('seoOgTitle').value,
        og_description: document.getElementById('seoOgDesc').value,
        og_image_url: document.getElementById('seoOgImg').value,
        updated_at: new Date().toISOString()
    };
    try {
        if (id) await sb.from('seo_settings').update(data).eq('id', id);
        else await sb.from('seo_settings').insert(data);
        showToast('تم الحفظ','suc');
    } catch(e) { showToast('خطأ','err'); }
};

// ═══════════════════════════════════════════════════════
// 13. USERS ANALYTICS
// ═══════════════════════════════════════════════════════
window.loadUsersAnalytics = async function(page=1) {
    const { sb } = window.A;
    const PAGE_SIZE = 30;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
        <div class="search-box"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="search" id="uaSearch" placeholder="ابحث..." oninput="uaSearchDebounce()"></div>
        <div style="display:flex;gap:8px">
            <select class="form-select" id="uaSort" style="width:auto" onchange="loadUsersAnalytics(1)">
                <option value="attempts">الأكثر تدريباً</option>
                <option value="new">الأحدث</option>
                <option value="accuracy">أعلى دقة</option>
                <option value="inactive">الأقل نشاطاً</option>
            </select>
            <button class="btn btn-ghost" onclick="exportUsers()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>CSV</button>
        </div>
    </div>
    <div class="card"><div class="tbl-wrap" id="uaTable"><div class="loader">...</div></div></div>`;

    try {
        const sort = document.getElementById('uaSort').value;
        let q = sb.from('profiles').select('id,full_name,email,phone,subscription_type,subscription_end,used_coupon,xp,created_at,last_seen_at', { count:'exact' });

        if (sort === 'new') q = q.order('created_at',{ascending:false});
        else q = q.order('xp',{ascending:false,nullsFirst:false});

        const { data, count } = await q.range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1);

        // Attempts counts + آخر تدريب لكل مستخدم
        const uids = (data||[]).map(u=>u.id);
        const { data: atts } = await sb.from('attempts').select('user_id,is_correct,created_at').in('user_id', uids);
        const stats = {};
        (atts||[]).forEach(a => {
            if (!stats[a.user_id]) stats[a.user_id] = { t:0, c:0, last: null };
            stats[a.user_id].t++;
            if (a.is_correct) stats[a.user_id].c++;
            if (!stats[a.user_id].last || a.created_at > stats[a.user_id].last) stats[a.user_id].last = a.created_at;
        });

        const tbl = document.getElementById('uaTable');
        if (!data || data.length === 0) { tbl.innerHTML = '<div class="empty-d">لا أعضاء</div>'; return; }

        const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('ar-SA',{year:'2-digit',month:'short',day:'numeric'}) : '—';

        tbl.innerHTML = '<table><thead><tr>'
            + '<th>العضو</th>'
            + '<th>الاشتراك</th>'
            + '<th>الكوبون</th>'
            + '<th>المحلولة</th>'
            + '<th>نسبة الصح</th>'
            + '<th>آخر دخول</th>'
            + '<th>آخر تدريب</th>'
            + '<th>تاريخ التسجيل</th>'
            + '<th></th>'
            + '</tr></thead><tbody>' +
            data.map(u => {
                const st = stats[u.id] || {t:0,c:0,last:null};
                const acc = st.t > 0 ? Math.round(st.c/st.t*100) : 0;
                const subActive = u.subscription_type && u.subscription_type !== 'free' && u.subscription_end && new Date(u.subscription_end) > new Date();
                const subLabel = subActive
                    ? (u.subscription_type==='yearly'?'سنوي':u.subscription_type==='quarterly'?'ربع سنوي':'شهري')
                    : 'مجاني';
                const sub = subActive
                    ? '<span class="status-pill active">'+subLabel+'</span>'
                    : '<span class="status-pill free">'+subLabel+'</span>';
                const coupon = u.used_coupon
                    ? '<span style="font-size:10px;color:var(--acc);background:var(--as);padding:2px 8px;border-radius:8px;font-weight:600">'+esc(u.used_coupon)+'</span>'
                    : '<span class="td-muted">—</span>';
                return `<tr>
                    <td><div style="display:flex;align-items:center;gap:10px"><div class="tbl-avatar">${esc((u.full_name||'?').charAt(0))}</div><div><div class="td-name">${esc(u.full_name||'—')}</div><div style="font-size:9px;color:var(--i4)">${esc(u.email||'')}</div></div></div></td>
                    <td>${sub}</td>
                    <td>${coupon}</td>
                    <td><b>${fmt(st.t)}</b></td>
                    <td style="min-width:90px"><div style="display:flex;align-items:center;gap:6px"><div style="width:40px;height:4px;background:var(--s2);border-radius:2px;overflow:hidden"><div style="width:${acc}%;height:100%;background:${acc>=70?'var(--suc)':acc>=50?'var(--acc)':'var(--dng)'}"></div></div><b style="color:${acc>=70?'var(--suc)':acc>=50?'var(--acc)':'var(--dng)'};font-size:11px">${acc}%</b></div></td>
                    <td class="td-muted">${fmtDate(u.last_seen_at)}</td>
                    <td class="td-muted">${fmtDate(st.last)}</td>
                    <td class="td-muted">${fmtDate(u.created_at)}</td>
                    <td><button class="q-act-btn" title="تعديل" onclick="viewUser('${u.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
                </tr>`;
            }).join('') + '</tbody></table>';

        const totalPages = Math.ceil((count||0)/PAGE_SIZE);
        if (totalPages > 1) {
            tbl.innerHTML += '<div class="pagination" style="padding:14px"><div class="pg-info">'+fmt(count)+' · صفحة '+page+'/'+totalPages+'</div><div class="pg-btns"><button class="pg-btn" '+(page<=1?'disabled':'')+' onclick="loadUsersAnalytics('+(page-1)+')"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button><button class="pg-btn" '+(page>=totalPages?'disabled':'')+' onclick="loadUsersAnalytics('+(page+1)+')"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button></div></div>';
        }
    } catch(e) { showToast('خطأ','err'); }
};

let uaTimer;
window.uaSearchDebounce = function() { clearTimeout(uaTimer); uaTimer = setTimeout(()=>loadUsersAnalytics(1), 400); };

// ═══════════════════════════════════════════════════════
// 14. STAFF — CRUD + صلاحيات + نشاط
// ═══════════════════════════════════════════════════════
const PERMISSION_SECTIONS = [
    { key:'questions', label:'الأسئلة والمراجعة', actions:['view','edit','delete'] },
    { key:'users',     label:'الأعضاء',           actions:['view','edit'] },
    { key:'finance',   label:'المالية والفواتير', actions:['view','edit'] },
    { key:'banners',   label:'البنرات والصفحات',  actions:['view','edit'] },
    { key:'tips',      label:'النصائح اليومية',   actions:['view','edit'] },
    { key:'reports',   label:'البلاغات والتسريبات', actions:['view','edit'] },
    { key:'analytics', label:'التحليلات والزوار', actions:['view'] },
    { key:'settings',  label:'إعدادات الموقع',    actions:['view','edit'] }
];
const ACTION_LABELS = { view:'عرض', edit:'تعديل', delete:'حذف' };

function defaultPermissions(role) {
    const perms = {};
    PERMISSION_SECTIONS.forEach(s => {
        perms[s.key] = {};
        s.actions.forEach(a => {
            perms[s.key][a] = role === 'admin';
        });
    });
    return perms;
}

window.loadStaff = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <style>
    .staff-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
    .staff-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
    .staff-card{background:var(--sf);border:1px solid var(--ln);border-radius:14px;padding:18px;position:relative;overflow:hidden}
    .staff-card::before{content:"";position:absolute;top:0;right:0;left:0;height:3px;background:var(--role-clr)}
    .staff-card[data-role="admin"]{--role-clr:linear-gradient(90deg,#F59E0B,#EF4444)}
    .staff-card[data-role="staff"]{--role-clr:linear-gradient(90deg,#6D5DF6,#22C55E)}
    .staff-av{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;font-size:18px;margin-bottom:10px}
    .staff-name{font-size:15px;font-weight:700;margin-bottom:2px}
    .staff-role{font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;display:inline-block;margin-bottom:10px}
    .staff-role.admin{background:rgba(245,158,11,.12);color:#B45309}
    .staff-role.staff{background:rgba(109,93,246,.12);color:#5B4DD4}
    .staff-email{font-size:11px;color:var(--i3);margin-bottom:12px;word-break:break-all}
    .staff-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
    .staff-stat{background:var(--s2);padding:8px;border-radius:8px;text-align:center}
    .staff-stat .v{font-size:15px;font-weight:800;color:var(--pri)}
    .staff-stat .l{font-size:9px;color:var(--i3);margin-top:2px}
    .staff-actions{display:flex;gap:6px}
    .staff-actions .btn{flex:1;font-size:11px;padding:6px 8px}
    </style>

    <div class="staff-toolbar">
        <div style="font-size:14px;font-weight:700">الموظفون والصلاحيات</div>
        <button class="btn btn-pri" onclick="openAddStaffModal()">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            إضافة موظف
        </button>
    </div>
    <div id="staffGrid" class="staff-grid"><div class="loader">جاري التحميل...</div></div>`;

    try {
        // 1. جلب الموظفين والمدراء
        const { data: staff } = await sb.from('profiles')
            .select('id,full_name,email,role,avatar_emoji,created_at,last_seen_at')
            .in('role', ['admin','staff']).order('full_name');

        // 2. جلب staff_stats
        const uids = (staff||[]).map(s => s.id);
        let statsMap = {};
        if (uids.length > 0) {
            try {
                const { data: stats } = await sb.from('staff_stats').select('*').in('user_id', uids);
                (stats||[]).forEach(s => { statsMap[s.user_id] = s; });
            } catch(e){}
        }

        // 3. عدد الأسئلة المضافة (إن كان الجدول يدعم created_by)
        let questionsMap = {};
        try {
            const { data: qs } = await sb.from('questions').select('id,created_by').in('created_by', uids);
            (qs||[]).forEach(q => { questionsMap[q.created_by] = (questionsMap[q.created_by]||0) + 1; });
        } catch(e){}

        const grid = document.getElementById('staffGrid');
        if (!staff || staff.length === 0) {
            grid.innerHTML = '<div class="empty"><div class="empty-ic">👤</div><div class="empty-t">لا موظفين بعد</div><div class="empty-d">اضغط "إضافة موظف" لبدء فريقك</div></div>';
            return;
        }

        const colors = ['#6D5DF6','#22C55E','#FF8A3D','#EF4444','#F59E0B','#0F766E','#3B5BDB'];
        grid.innerHTML = staff.map((s, i) => {
            const st = statsMap[s.id] || {};
            const qCount = questionsMap[s.id] || st.questions_added || 0;
            const tickets = st.tickets_resolved || 0;
            const lastSeen = s.last_seen_at ? new Date(s.last_seen_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}) : '—';
            const roleLabel = s.role === 'admin' ? 'المدير العام' : 'موظف';
            return `
            <div class="staff-card" data-role="${esc(s.role)}">
                <div class="staff-av" style="background:${colors[i%colors.length]}">${esc(s.avatar_emoji || (s.full_name||'?').charAt(0))}</div>
                <div class="staff-name">${esc(s.full_name || '—')}</div>
                <span class="staff-role ${s.role}">${roleLabel}</span>
                <div class="staff-email">${esc(s.email || '')}</div>
                <div class="staff-stats">
                    <div class="staff-stat"><div class="v">${fmt(qCount)}</div><div class="l">أسئلة مُضافة</div></div>
                    <div class="staff-stat"><div class="v">${fmt(tickets)}</div><div class="l">بلاغات مُعالجة</div></div>
                </div>
                <div style="font-size:10px;color:var(--i4);margin-bottom:10px">آخر دخول: ${lastSeen}</div>
                <div class="staff-actions">
                    <button class="btn btn-pri" onclick="editStaffPermissions('${s.id}')">الصلاحيات</button>
                    <button class="btn btn-ghost" onclick="viewStaffActivity('${s.id}')">النشاط</button>
                    ${s.role !== 'admin' ? `<button class="btn btn-ghost" style="color:var(--dng)" onclick="removeStaff('${s.id}','${esc((s.full_name||'').replace(/'/g,"\\'"))}')">إزالة</button>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'err');
    }
};

// ── إضافة موظف ──
window.openAddStaffModal = function() {
    const body = `
    <div class="form-grid">
        <div class="form-field full">
            <label class="form-label">ابحث بالبريد الإلكتروني أو الاسم *</label>
            <input class="form-input" id="addStaffSearch" oninput="searchStaffCandidates()" placeholder="أدخل بريد/اسم مستخدم موجود">
            <div style="font-size:10px;color:var(--i3);margin-top:4px">يجب أن يكون المستخدم مسجّل في التطبيق</div>
        </div>
        <div class="form-field full" id="candidatesWrap" style="display:none">
            <label class="form-label">النتائج — اختر المستخدم</label>
            <div id="candidatesList" style="max-height:200px;overflow-y:auto;border:1px solid var(--ln);border-radius:8px"></div>
        </div>
        <div class="form-field full" id="addStaffRoleWrap" style="display:none">
            <label class="form-label">الدور</label>
            <select class="form-select" id="addStaffRole">
                <option value="staff">موظف (صلاحيات مخصّصة)</option>
                <option value="admin">مدير عام (صلاحيات كاملة)</option>
            </select>
        </div>
    </div>
    <input type="hidden" id="addStaffSelectedId" value="">
    `;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" id="addStaffConfirm" onclick="confirmAddStaff()" disabled>إضافة</button>
    `;
    openModal('إضافة موظف جديد', body, foot);
};

let staffSearchTimer;
window.searchStaffCandidates = function() {
    clearTimeout(staffSearchTimer);
    staffSearchTimer = setTimeout(async () => {
        const { sb } = window.A;
        const q = document.getElementById('addStaffSearch').value.trim();
        const wrap = document.getElementById('candidatesWrap');
        const list = document.getElementById('candidatesList');
        if (q.length < 2) { wrap.style.display = 'none'; return; }
        try {
            const { data } = await sb.from('profiles')
                .select('id,full_name,email,role')
                .or('full_name.ilike.%'+q+'%,email.ilike.%'+q+'%')
                .limit(10);
            const users = (data||[]).filter(u => u.role !== 'admin' && u.role !== 'staff');
            if (users.length === 0) {
                list.innerHTML = '<div style="padding:14px;text-align:center;font-size:12px;color:var(--i3)">لا نتائج — هل الحساب موظف بالفعل؟</div>';
            } else {
                list.innerHTML = users.map(u => `
                    <div onclick="selectCandidate('${u.id}','${esc((u.full_name||'').replace(/'/g,"\\'"))}','${esc((u.email||'').replace(/'/g,"\\'"))}')" style="padding:10px 12px;border-bottom:1px solid var(--ln);cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--ps)'" onmouseout="this.style.background=''">
                        <div style="font-size:13px;font-weight:600">${esc(u.full_name||'—')}</div>
                        <div style="font-size:11px;color:var(--i3)">${esc(u.email||'')}</div>
                    </div>`).join('');
            }
            wrap.style.display = '';
        } catch(e) {}
    }, 350);
};

window.selectCandidate = function(id, name, email) {
    document.getElementById('addStaffSelectedId').value = id;
    document.getElementById('addStaffSearch').value = name + ' — ' + email;
    document.getElementById('candidatesWrap').style.display = 'none';
    document.getElementById('addStaffRoleWrap').style.display = '';
    document.getElementById('addStaffConfirm').disabled = false;
};

window.confirmAddStaff = async function() {
    const { sb } = window.A;
    const userId = document.getElementById('addStaffSelectedId').value;
    const role = document.getElementById('addStaffRole').value;
    if (!userId) return;
    try {
        // 1. تحديث role في profiles
        const { error: e1 } = await sb.from('profiles').update({ role }).eq('id', userId);
        if (e1) throw e1;
        // 2. إنشاء/تحديث staff_stats مع الصلاحيات الافتراضية
        const perms = defaultPermissions(role);
        try {
            await sb.from('staff_stats').upsert({
                user_id: userId,
                display_role: role === 'admin' ? 'المدير العام' : 'موظف',
                custom_permissions: perms
            }, { onConflict: 'user_id' });
        } catch(e){ /* جدول قد لا يدعم upsert — لا بأس */ }
        showToast('تمت الإضافة','success');
        closeModal();
        loadStaff();
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'error');
    }
};

// ── تعديل صلاحيات موظف ──
window.editStaffPermissions = async function(userId) {
    const { sb } = window.A;
    // جلب البيانات الحالية
    const [{ data: p }, statsRes] = await Promise.all([
        sb.from('profiles').select('id,full_name,email,role').eq('id', userId).single(),
        sb.from('staff_stats').select('*').eq('user_id', userId).maybeSingle()
    ]);
    if (!p) return;
    const existing = (statsRes.data && statsRes.data.custom_permissions) || defaultPermissions(p.role);

    const sectionsHtml = PERMISSION_SECTIONS.map(sec => {
        const cur = existing[sec.key] || {};
        const actionsHtml = sec.actions.map(a => `
            <label style="display:inline-flex;align-items:center;gap:5px;margin-left:12px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="perm_${sec.key}_${a}" ${cur[a]?'checked':''}>
                ${ACTION_LABELS[a]}
            </label>`).join('');
        return `
            <div style="padding:10px 12px;border:1px solid var(--ln);border-radius:10px;margin-bottom:8px">
                <div style="font-size:13px;font-weight:700;margin-bottom:6px">${esc(sec.label)}</div>
                <div>${actionsHtml}</div>
            </div>`;
    }).join('');

    const body = `
    <div style="padding:10px 12px;background:var(--ps);border:1px solid var(--pm);border-radius:10px;margin-bottom:14px;font-size:12px">
        <b>${esc(p.full_name||'—')}</b> &nbsp;·&nbsp; ${esc(p.email||'')} &nbsp;·&nbsp; ${p.role==='admin'?'المدير العام':'موظف'}
    </div>
    <div class="form-field full" style="margin-bottom:10px">
        <label class="form-label">الدور</label>
        <select class="form-select" id="permRole">
            <option value="staff" ${p.role==='staff'?'selected':''}>موظف</option>
            <option value="admin" ${p.role==='admin'?'selected':''}>مدير عام</option>
        </select>
    </div>
    <div style="max-height:380px;overflow-y:auto">${sectionsHtml}</div>
    <input type="hidden" id="permUserId" value="${esc(userId)}">`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="savePermissions()">حفظ الصلاحيات</button>
    `;
    openModal('إدارة صلاحيات الموظف', body, foot);
};

window.savePermissions = async function() {
    const { sb } = window.A;
    const userId = document.getElementById('permUserId').value;
    const role = document.getElementById('permRole').value;

    // اجمع الصلاحيات من الصناديق
    const perms = {};
    PERMISSION_SECTIONS.forEach(sec => {
        perms[sec.key] = {};
        sec.actions.forEach(a => {
            const cb = document.getElementById('perm_'+sec.key+'_'+a);
            perms[sec.key][a] = cb ? cb.checked : false;
        });
    });

    try {
        // 1. حدّث الدور في profiles
        await sb.from('profiles').update({ role }).eq('id', userId);
        // 2. حدّث الصلاحيات في staff_stats
        await sb.from('staff_stats').upsert({
            user_id: userId,
            display_role: role === 'admin' ? 'المدير العام' : 'موظف',
            custom_permissions: perms
        }, { onConflict: 'user_id' });
        showToast('حُفظت الصلاحيات','success');
        closeModal();
        loadStaff();
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'error');
    }
};

// ── عرض نشاط موظف ──
window.viewStaffActivity = async function(userId) {
    const { sb } = window.A;
    try {
        const [{ data: p }, statsRes] = await Promise.all([
            sb.from('profiles').select('id,full_name,email,role,created_at,last_seen_at').eq('id', userId).single(),
            sb.from('staff_stats').select('*').eq('user_id', userId).maybeSingle()
        ]);
        if (!p) return;
        const st = statsRes.data || {};

        // آخر الأسئلة المضافة
        let recentQs = [];
        try {
            const { data } = await sb.from('questions')
                .select('id,question_text,section,created_at')
                .eq('created_by', userId).order('created_at',{ascending:false}).limit(10);
            recentQs = data || [];
        } catch(e){}

        const qCount = recentQs.length || st.questions_added || 0;
        const lastSeenStr = p.last_seen_at ? new Date(p.last_seen_at).toLocaleString('ar-SA') : '—';
        const joinedStr = new Date(p.created_at).toLocaleDateString('ar-SA');

        const qsHtml = recentQs.length > 0 ? recentQs.map(q => `
            <div style="padding:10px 12px;border-bottom:1px solid var(--ln);font-size:12px">
                <div style="font-weight:600;color:var(--ink)">${esc((q.question_text||'').substring(0,80))}${(q.question_text||'').length>80?'...':''}</div>
                <div style="font-size:10px;color:var(--i4);margin-top:3px">${esc(q.section||'—')} · ${new Date(q.created_at).toLocaleDateString('ar-SA')}</div>
            </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--i3);font-size:12px">لم يُضَف أي سؤال بعد</div>';

        const body = `
        <div style="padding:14px;background:var(--ps);border-radius:10px;margin-bottom:14px">
            <div style="font-size:15px;font-weight:700;margin-bottom:4px">${esc(p.full_name||'—')}</div>
            <div style="font-size:11px;color:var(--i3)">${esc(p.email||'')} · ${p.role==='admin'?'المدير العام':'موظف'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
            <div style="padding:12px;background:var(--s2);border-radius:10px;text-align:center">
                <div style="font-size:20px;font-weight:800;color:var(--pri)">${fmt(qCount)}</div>
                <div style="font-size:10px;color:var(--i3)">أسئلة مضافة</div>
            </div>
            <div style="padding:12px;background:var(--s2);border-radius:10px;text-align:center">
                <div style="font-size:20px;font-weight:800;color:var(--suc)">${fmt(st.tickets_resolved||0)}</div>
                <div style="font-size:10px;color:var(--i3)">بلاغات مُعالجة</div>
            </div>
            <div style="padding:12px;background:var(--s2);border-radius:10px;text-align:center">
                <div style="font-size:20px;font-weight:800;color:var(--acc)">${(Number(st.rating||0)).toFixed(1)}</div>
                <div style="font-size:10px;color:var(--i3)">تقييم الجودة</div>
            </div>
        </div>
        <div style="font-size:11px;color:var(--i3);margin-bottom:4px">انضم في: ${joinedStr}</div>
        <div style="font-size:11px;color:var(--i3);margin-bottom:14px">آخر دخول: ${lastSeenStr}</div>
        <div style="font-size:12px;font-weight:700;margin-bottom:8px">آخر الأسئلة المضافة</div>
        <div style="border:1px solid var(--ln);border-radius:10px;max-height:260px;overflow-y:auto">${qsHtml}</div>
        `;
        openModal('نشاط ' + (p.full_name || 'الموظف'), body, '<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>');
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'error');
    }
};

// ── إزالة موظف (ترجعه لمستخدم عادي) ──
window.removeStaff = async function(userId, name) {
    if (!confirm('هل تريد إزالة "' + name + '" من الموظفين؟ سيعود مستخدماً عادياً.')) return;
    const { sb } = window.A;
    try {
        await sb.from('profiles').update({ role: 'user' }).eq('id', userId);
        showToast('تمت الإزالة','success');
        loadStaff();
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'error');
    }
};

// ═══════════════════════════════════════════════════════
// 15. INCOMING REPORTS
// ═══════════════════════════════════════════════════════
window.loadIncomingReports = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="irepList"><div class="loader">...</div></div>';
    try {
        const { data, count } = await sb.from('reports')
            .select('id,reason,status,created_at,questions(id,question_text,section),profiles(full_name)',{count:'exact'})
            .order('created_at',{ascending:false}).limit(100);
        const list = document.getElementById('irepList');
        if (!data || data.length === 0) { list.innerHTML = '<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">لا بلاغات</div></div>'; return; }
        const pending = data.filter(r => r.status === 'pending').length;
        list.innerHTML = '<div style="font-size:13px;margin-bottom:14px;color:var(--i2)"><b style="color:var(--dng)">'+pending+'</b> معلّق من إجمالي <b>'+data.length+'</b></div>' +
        '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>المبلّغ</th><th>السؤال</th><th>السبب</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead><tbody>' +
        data.map(r => {
            const statusMap = {pending:'<span class="status-pill pending">معلق</span>',resolved:'<span class="status-pill active">تم الحل</span>',rejected:'<span class="status-pill expired">مرفوض</span>'};
            return `<tr>
                <td class="td-name">${esc(r.profiles?.full_name||'—')}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis"><span class="q-tag" style="margin-left:6px">${sectionTag(r.questions?.section)}</span>${esc((r.questions?.question_text||'—').substring(0,60))}…</td>
                <td style="color:var(--dng);font-weight:600">${esc(r.reason)}</td>
                <td>${statusMap[r.status]||r.status}</td>
                <td class="td-muted">${new Date(r.created_at).toLocaleDateString('ar-SA')}</td>
                <td>${r.status==='pending'?'<button class="btn btn-ghost" onclick="switchToReview()">مراجعة</button>':'—'}</td>
            </tr>`;
        }).join('') + '</tbody></table></div></div>';
    } catch(e) { showToast('خطأ','err'); }
};

window.switchToReview = function() { document.querySelector('[data-page="review"]')?.click(); };

// ═══════════════════════════════════════════════════════
// 16. VISITORS ANALYTICS (بيانات حقيقية)
// ═══════════════════════════════════════════════════════
window.loadVisitors = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="visArea"><div class="loader">...</div></div>';
    try {
        const today = new Date().toISOString().split('T')[0];
        const todayStart = today + 'T00:00:00';
        const weekAgo = new Date(Date.now() - 7*864e5).toISOString();

        // كل البيانات بالتوازي
        const [paysToday, signupsToday, activeToday, trainedToday, newSignupsWeek, visitorsToday] = await Promise.all([
            sb.from('payments').select('amount,payment_id').eq('status','paid').gte('paid_at',todayStart),
            sb.from('profiles').select('*',{count:'exact',head:true}).gte('created_at',todayStart),
            sb.from('profiles').select('id',{count:'exact',head:true}).gte('last_seen_at', new Date(Date.now()-5*60000).toISOString()),
            sb.from('attempts').select('user_id').gte('created_at',todayStart),
            sb.from('profiles').select('*',{count:'exact',head:true}).gte('created_at',weekAgo),
            sb.from('analytics_events').select('anonymous_id,user_id',{count:'exact'}).gte('created_at',todayStart).eq('event_type','page_view')
        ]);

        const realPays = (paysToday.data||[]).filter(p => !(p.payment_id||'').startsWith('FREE-') && Number(p.amount||0) > 0);
        const todayRev = realPays.reduce((s,p)=>s+Number(p.amount||0),0);

        // Unique trained users today
        const uniqueTrainees = new Set((trainedToday.data||[]).map(a=>a.user_id)).size;

        // Unique visitors (fallback لـ 0 لو الجدول فاضي)
        const uniqueVisitors = visitorsToday.count || 0;

        // Conversion: signups / visitors
        const cvr = uniqueVisitors > 0 ? ((signupsToday.count||0) / uniqueVisitors * 100).toFixed(1) : 0;

        // Activity feed - آخر 20 حدث
        const [recentSignups, recentAttempts, recentPayments] = await Promise.all([
            sb.from('profiles').select('id,full_name,created_at').order('created_at',{ascending:false}).limit(10),
            sb.from('attempts').select('user_id,is_correct,created_at,profiles(full_name)').order('created_at',{ascending:false}).limit(10),
            sb.from('payments').select('user_id,amount,created_at,payment_id,profiles(full_name)').eq('status','paid').order('created_at',{ascending:false}).limit(10)
        ]);

        const feed = [];
        (recentSignups.data||[]).forEach(p => feed.push({type:'signup',icon:'👤',color:'var(--pri)',text:'<b>'+esc(p.full_name||'مستخدم')+'</b> سجّل حساب جديد',time:p.created_at}));
        (recentPayments.data||[]).forEach(p => {
            const isFree = (p.payment_id||'').startsWith('FREE-');
            if (isFree) feed.push({type:'coupon',icon:'🎟️',color:'var(--acc)',text:'<b>'+esc(p.profiles?.full_name||'مستخدم')+'</b> فعّل اشتراك مجاني (كوبون)',time:p.created_at});
            else feed.push({type:'subscribe',icon:'⭐',color:'var(--suc)',text:'<b>'+esc(p.profiles?.full_name||'مستخدم')+'</b> اشترك بـ '+Number(p.amount)+' ريال',time:p.created_at});
        });
        // جمع المحاولات بالمستخدم
        const attByUser = {};
        (recentAttempts.data||[]).forEach(a => {
            const k = a.user_id;
            if (!attByUser[k]) attByUser[k] = { name: a.profiles?.full_name, time: a.created_at, count: 0, correct: 0 };
            attByUser[k].count++;
            if (a.is_correct) attByUser[k].correct++;
        });
        Object.values(attByUser).slice(0,5).forEach(u => feed.push({type:'practice',icon:'📝',color:'var(--pri)',text:'<b>'+esc(u.name||'مستخدم')+'</b> حل '+u.count+' سؤال ('+u.correct+' صح)',time:u.time}));

        feed.sort((a,b) => new Date(b.time) - new Date(a.time));

        // Top trainees today
        const trainStats = {};
        (trainedToday.data||[]).forEach(a => trainStats[a.user_id] = (trainStats[a.user_id]||0) + 1);
        const topTrainees = Object.entries(trainStats).sort((a,b)=>b[1]-a[1]).slice(0,5);
        let topTraineesData = [];
        if (topTrainees.length > 0) {
            const { data: profs } = await sb.from('profiles').select('id,full_name,avatar_emoji').in('id', topTrainees.map(t=>t[0]));
            topTraineesData = topTrainees.map(t => {
                const p = (profs||[]).find(x => x.id === t[0]);
                return { name: p?.full_name||'مستخدم', avatar: p?.avatar_emoji, count: t[1] };
            });
        }

        document.getElementById('visArea').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
            <div class="kpi green"><div class="kpi-label">إيراد اليوم</div><div class="kpi-val">${fmt(Math.round(todayRev))}</div><div class="kpi-sub">ريال · ${realPays.length} معاملة</div></div>
            <div class="kpi blue"><div class="kpi-label">مشتركون جدد اليوم</div><div class="kpi-val">${fmt(signupsToday.count||0)}</div><div class="kpi-sub">+${fmt(newSignupsWeek.count||0)} هذا الأسبوع</div></div>
            <div class="kpi orange"><div class="kpi-label">تدربوا اليوم</div><div class="kpi-val">${fmt(uniqueTrainees)}</div><div class="kpi-sub">مستخدم نشط</div></div>
            <div class="kpi gold"><div class="kpi-label">متصلون الآن</div><div class="kpi-val">${fmt(activeToday.count||0)}</div><div class="kpi-sub">آخر 5 دقائق</div></div>
        </div>

        <div class="kpi-grid2" style="grid-template-columns:repeat(3,1fr)">
            <div class="kpi blue"><div class="kpi-label">زوار اليوم</div><div class="kpi-val">${fmt(uniqueVisitors)}</div><div class="kpi-sub">${uniqueVisitors > 0 ? 'من analytics_events' : 'لا تتبع بعد'}</div></div>
            <div class="kpi orange"><div class="kpi-label">معدل التحويل</div><div class="kpi-val">${cvr}<small style="font-size:14px">%</small></div><div class="kpi-sub">زائر → مسجّل</div></div>
            <div class="kpi green"><div class="kpi-label">معدل الإيراد لكل زائر</div><div class="kpi-val">${uniqueVisitors>0?(todayRev/uniqueVisitors).toFixed(2):'—'}</div><div class="kpi-sub">ريال / زائر</div></div>
        </div>

        <div class="row c2">
            <div class="card"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><div><div class="card-title">آخر النشاطات</div><div class="card-sub">حقيقية — لحظية</div></div></div></div>
            <div class="card-body" style="max-height:420px;overflow-y:auto">${
                feed.length === 0 ? '<div class="empty-d" style="padding:20px">لا نشاطات بعد</div>' :
                feed.slice(0,15).map(f => {
                    const elapsed = Math.floor((Date.now() - new Date(f.time).getTime()) / 60000);
                    const timeStr = elapsed < 1 ? 'الآن' : elapsed < 60 ? 'قبل '+elapsed+' دقيقة' : elapsed < 1440 ? 'قبل '+Math.floor(elapsed/60)+' ساعة' : new Date(f.time).toLocaleDateString('ar-SA');
                    return '<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--ln);align-items:center"><div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:'+f.color.replace(')',',.12)').replace('var(--','rgba(var(--')+';font-size:14px">'+f.icon+'</div><div style="flex:1"><div style="font-size:12px;line-height:1.5">'+f.text+'</div><div style="font-size:9px;color:var(--i4);margin-top:2px">'+timeStr+'</div></div></div>';
                }).join('')
            }</div></div>

            <div class="card"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic grn"><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><div><div class="card-title">أنشط المستخدمين اليوم</div></div></div></div>
            <div class="card-body">${
                topTraineesData.length === 0 ? '<div class="empty-d" style="padding:20px">لا تدريب اليوم بعد</div>' :
                topTraineesData.map((u,i) => '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--ln)"><div style="width:22px;text-align:center;font-size:11px;font-weight:700;color:'+(i===0?'var(--gold)':i===1?'#9CA3AF':'var(--acc)')+'">#'+(i+1)+'</div><div class="tbl-avatar">'+esc(u.avatar||(u.name||'?').charAt(0))+'</div><div style="flex:1;font-size:12px;font-weight:600">'+esc(u.name)+'</div><div style="font-size:12px;font-weight:700;color:var(--pri)">'+u.count+' سؤال</div></div>').join('')
            }</div></div>
        </div>`;
    } catch(e) { console.error(e); showToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// 17. SETTINGS
// ═══════════════════════════════════════════════════════
window.loadSettings = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div class="settings-section">
        <div class="settings-title">عام</div>
        <div class="settings-group">
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>
                <div class="sr-body"><div class="sr-title">اسم التطبيق</div><div class="sr-sub">مدارك النخبة</div></div></div>
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>
                <div class="sr-body"><div class="sr-title">واتساب الدعم</div><div class="sr-sub" id="waSup">+966500000000</div></div>
                <button class="btn btn-ghost" onclick='editSetting("whatsapp")'>تعديل</button></div>
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div>
                <div class="sr-body"><div class="sr-title">رقم النشاط التجاري</div><div class="sr-sub">620113</div></div></div>
        </div>
    </div>
    <div class="settings-section">
        <div class="settings-title">الإشعارات</div>
        <div class="settings-group">
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                <div class="sr-body"><div class="sr-title">إشعار عضو جديد</div><div class="sr-sub">تنبيه عند تسجيل عضو جديد</div></div>
                <div class="toggle2 on" onclick="this.classList.toggle('on')"></div></div>
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                <div class="sr-body"><div class="sr-title">إشعار اشتراك جديد</div><div class="sr-sub">تنبيه عند عملية دفع</div></div>
                <div class="toggle2 on" onclick="this.classList.toggle('on')"></div></div>
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/></svg></div>
                <div class="sr-body"><div class="sr-title">إشعار بلاغ جديد</div><div class="sr-sub">تنبيه عند ورود بلاغ</div></div>
                <div class="toggle2 on" onclick="this.classList.toggle('on')"></div></div>
        </div>
    </div>
    <div class="settings-section">
        <div class="settings-title">معلومات النظام</div>
        <div class="settings-group">
            <div class="setting-row"><div class="sr-body"><div class="sr-title">الإصدار</div><div class="sr-sub">v2.0.0</div></div></div>
            <div class="setting-row"><div class="sr-body"><div class="sr-title">قاعدة البيانات</div><div class="sr-sub">Supabase — متصل</div></div><span class="status-pill active"><span class="status-dot"></span>نشط</span></div>
        </div>
    </div>`;
};

window.editSetting = function(key) {
    showToast('قريباً — تعديل الإعداد','');
};

// ═══════════════════════════════════════════════════════
// 18. PAYOUTS — طلبات الصرف (STC Pay)
// ═══════════════════════════════════════════════════════
window._payoutsFilter = 'pending'; // all | pending | processing | completed | rejected

window.loadPayouts = async function() {
    const { sb } = window.A;
    const isPreview = new URLSearchParams(window.location.search).has('preview');

    $c().innerHTML = `
    <div id="payoutsArea">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px" id="payoutsKpis">
            <div class="loader">...</div>
        </div>

        <div class="card">
            <div class="card-hdr">
                <div class="card-hdr-l">
                    <div class="card-ic pur"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M7 15h4"/></svg></div>
                    <div><div class="card-title">طلبات الصرف</div><div class="card-sub">إدارة تحويلات STC Pay للمُحيلين</div></div>
                </div>
            </div>
            <div class="q-filter-row" style="padding:0 16px 12px" id="payoutsFilters">
                <button class="q-filter-btn on" data-status="pending"    onclick="payoutsFilter('pending')">قيد الانتظار</button>
                <button class="q-filter-btn"    data-status="processing" onclick="payoutsFilter('processing')">قيد المعالجة</button>
                <button class="q-filter-btn"    data-status="completed"  onclick="payoutsFilter('completed')">مكتملة</button>
                <button class="q-filter-btn"    data-status="rejected"   onclick="payoutsFilter('rejected')">مرفوضة</button>
                <button class="q-filter-btn"    data-status="all"        onclick="payoutsFilter('all')">الكل</button>
            </div>
            <div class="tbl-wrap" id="payoutsTable"><div class="loader">جاري التحميل...</div></div>
        </div>
    </div>`;

    try {
        // ── KPIs ──
        if (isPreview) {
            renderPayoutsKpis({ pending_count: 2, pending_amount: 310, processing_count: 1, processing_amount: 150, completed_count: 8, completed_amount: 1240, rejected_count: 1 });
        } else {
            const [pendR, procR, compR, rejR] = await Promise.all([
                sb.from('referral_payouts').select('amount', { count:'exact' }).eq('status','pending'),
                sb.from('referral_payouts').select('amount', { count:'exact' }).eq('status','processing'),
                sb.from('referral_payouts').select('amount', { count:'exact' }).eq('status','completed'),
                sb.from('referral_payouts').select('amount', { count:'exact' }).eq('status','rejected')
            ]);
            const sum = arr => (arr||[]).reduce((s,r)=>s+Number(r.amount||0),0);
            renderPayoutsKpis({
                pending_count: pendR.count || 0,
                pending_amount: sum(pendR.data),
                processing_count: procR.count || 0,
                processing_amount: sum(procR.data),
                completed_count: compR.count || 0,
                completed_amount: sum(compR.data),
                rejected_count: rejR.count || 0
            });
        }

        // ── Table ──
        await loadPayoutsTable();
    } catch(e) {
        console.error(e);
        showToast('خطأ في التحميل: ' + (e.message || ''), 'err');
    }
};

function renderPayoutsKpis(d) {
    document.getElementById('payoutsKpis').innerHTML = `
    <div class="kpi orange">
        <div class="kpi-label">قيد الانتظار</div>
        <div class="kpi-val">${fmt(d.pending_count)}</div>
        <div class="kpi-sub">${fmt(d.pending_amount)} ر.س — يحتاج معالجة</div>
    </div>
    <div class="kpi blue">
        <div class="kpi-label">قيد المعالجة</div>
        <div class="kpi-val">${fmt(d.processing_count)}</div>
        <div class="kpi-sub">${fmt(d.processing_amount)} ر.س</div>
    </div>
    <div class="kpi green">
        <div class="kpi-label">مكتملة</div>
        <div class="kpi-val">${fmt(d.completed_count)}</div>
        <div class="kpi-sub">${fmt(d.completed_amount)} ر.س مُحوّلة</div>
    </div>
    <div class="kpi red">
        <div class="kpi-label">مرفوضة</div>
        <div class="kpi-val">${fmt(d.rejected_count)}</div>
        <div class="kpi-sub">تم إرجاع الرصيد</div>
    </div>`;
}

window.payoutsFilter = function(status) {
    window._payoutsFilter = status;
    document.querySelectorAll('#payoutsFilters .q-filter-btn').forEach(c => {
        c.classList.toggle('on', c.dataset.status === status);
    });
    loadPayoutsTable();
};

async function loadPayoutsTable() {
    const { sb } = window.A;
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    const status = window._payoutsFilter;
    const el = document.getElementById('payoutsTable');
    if (!el) return;
    el.innerHTML = '<div class="loader">جاري التحميل...</div>';

    try {
        let rows = [];
        if (isPreview) {
            rows = buildPreviewPayouts(status);
        } else {
            let q = sb.from('v_payouts_admin').select('*').order('requested_at', { ascending: false }).limit(200);
            if (status !== 'all') q = q.eq('status', status);
            const { data, error } = await q;
            if (error) throw error;
            rows = data || [];
        }

        if (!rows.length) {
            el.innerHTML = `<div class="empty" style="padding:40px 20px">
                <div class="empty-ic">💸</div>
                <div class="empty-t">لا طلبات ${statusLabel(status)} حالياً</div>
                <div class="empty-d">ستظهر الطلبات هنا عند وصولها</div>
            </div>`;
            return;
        }

        el.innerHTML = '<table><thead><tr>' +
            '<th>المُحيل</th>' +
            '<th>المبلغ</th>' +
            '<th>STC Pay</th>' +
            '<th>الإحالات</th>' +
            '<th>تاريخ الطلب</th>' +
            '<th>الحالة</th>' +
            '<th>الإجراءات</th>' +
            '</tr></thead><tbody>' +
            rows.map(r => `<tr>
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <div class="tbl-avatar">${esc((r.user_name||'?').charAt(0))}</div>
                        <div>
                            <div class="td-name">${esc(r.user_name || '—')}</div>
                            <div style="font-size:10px;color:var(--i3)">${esc(r.user_email||'')} ${r.user_referral_code ? '· <span style="color:var(--pri);font-family:monospace">'+esc(r.user_referral_code)+'</span>' : ''}</div>
                        </div>
                    </div>
                </td>
                <td><b style="color:var(--suc);font-size:14px">${fmt(Number(r.amount||0))}</b> <span style="font-size:11px;color:var(--i3)">ر.س</span></td>
                <td>
                    <div style="font-family:monospace;font-size:13px;font-weight:700">${esc(r.stc_pay_number||'—')}</div>
                    <button class="q-act-btn" title="نسخ الرقم" onclick="copyPayoutStc('${esc(r.stc_pay_number||'')}')" style="margin-top:4px">
                        <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                </td>
                <td style="text-align:center"><b>${r.referrals_count || 0}</b></td>
                <td style="font-size:11px;color:var(--i3)">${fmtDate(r.requested_at)}</td>
                <td>${payoutStatusPill(r.status)}</td>
                <td>${payoutActions(r)}</td>
            </tr>`).join('') +
            '</tbody></table>';
    } catch(e) {
        console.error(e);
        el.innerHTML = '<div class="empty-d" style="padding:20px">خطأ في التحميل: ' + esc(e.message||'') + '</div>';
    }
}

function statusLabel(s) {
    return ({ pending:'قيد الانتظار', processing:'قيد المعالجة', completed:'مكتملة', rejected:'مرفوضة' })[s] || '';
}

function payoutStatusPill(s) {
    const map = {
        pending:    '<span class="status-pill pending">⏳ قيد الانتظار</span>',
        processing: '<span class="status-pill" style="background:rgba(139,127,255,.12);color:var(--pri)">🔄 قيد المعالجة</span>',
        completed:  '<span class="status-pill active">✓ مكتملة</span>',
        rejected:   '<span class="status-pill expired">✗ مرفوضة</span>'
    };
    return map[s] || s;
}

function payoutActions(r) {
    if (r.status === 'pending') {
        return `<div style="display:flex;gap:4px">
            <button class="btn btn-pri" style="padding:5px 10px;font-size:11px" onclick="openPayoutClaim('${r.id}')" title="استلام المعالجة">🔄 استلم</button>
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px;color:var(--dng)" onclick="openPayoutReject('${r.id}','${fmt(Number(r.amount||0))}')" title="رفض">✗ ارفض</button>
        </div>`;
    }
    if (r.status === 'processing') {
        return `<div style="display:flex;gap:4px">
            <button class="btn btn-pri" style="padding:5px 10px;font-size:11px;background:var(--suc);border-color:var(--suc)" onclick="openPayoutComplete('${r.id}','${fmt(Number(r.amount||0))}','${esc(r.stc_pay_number||'')}')" title="تأكيد الإتمام">✓ أتمم</button>
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px;color:var(--dng)" onclick="openPayoutReject('${r.id}','${fmt(Number(r.amount||0))}')" title="رفض">✗ ارفض</button>
        </div>`;
    }
    if (r.status === 'completed' || r.status === 'rejected') {
        const note = r.admin_note ? `<div style="font-size:10px;color:var(--i3);margin-top:2px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.admin_note)}">${esc(r.admin_note)}</div>` : '';
        const processor = r.processor_name ? `<div style="font-size:10px;color:var(--i3)">بواسطة ${esc(r.processor_name)}</div>` : '';
        return `<div>${note}${processor}</div>`;
    }
    return '—';
}

function fmtDate(s) {
    if (!s) return '—';
    try {
        const d = new Date(s);
        return d.toLocaleString('ar-SA', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return s; }
}

// ── Preview mock rows ──
function buildPreviewPayouts(filter) {
    const all = [
        { id:'pv-1', user_id:'u1', user_name:'عبدالله الزهراني', user_email:'abodi2040@gmail.com', user_referral_code:'MADAR-ZAHR1', amount:150, stc_pay_number:'+966553339885', status:'pending', requested_at:new Date(Date.now()-3*3600e3).toISOString(), referrals_count:15, admin_note:null, processor_name:null },
        { id:'pv-2', user_id:'u2', user_name:'سارة العتيبي', user_email:'sara@example.com', user_referral_code:'MADAR-SARAH', amount:160, stc_pay_number:'+966501234567', status:'pending', requested_at:new Date(Date.now()-18*3600e3).toISOString(), referrals_count:16, admin_note:null, processor_name:null },
        { id:'pv-3', user_id:'u3', user_name:'محمد الحربي', user_email:'moh@example.com', user_referral_code:'MADAR-MOHD7', amount:150, stc_pay_number:'+966555555555', status:'processing', requested_at:new Date(Date.now()-24*3600e3).toISOString(), referrals_count:15, admin_note:null, processor_name:'المدير العام' },
        { id:'pv-4', user_id:'u4', user_name:'نورة القحطاني', user_email:'nora@example.com', user_referral_code:'MADAR-NURA9', amount:200, stc_pay_number:'+966533334444', status:'completed', requested_at:new Date(Date.now()-5*86400e3).toISOString(), processed_at:new Date(Date.now()-4*86400e3).toISOString(), referrals_count:20, admin_note:'STC-REF-99213', processor_name:'المدير العام' },
        { id:'pv-5', user_id:'u5', user_name:'خالد السالم', user_email:'khalid@example.com', user_referral_code:'MADAR-KHLD3', amount:100, stc_pay_number:'+966500000000', status:'rejected', requested_at:new Date(Date.now()-7*86400e3).toISOString(), processed_at:new Date(Date.now()-6*86400e3).toISOString(), referrals_count:10, admin_note:'حسابات مكررة — نفس الـIP', processor_name:'المدير العام' }
    ];
    if (filter === 'all') return all;
    return all.filter(r => r.status === filter);
}

// ════════════════════════════════════════
// Actions: Claim / Complete / Reject
// ════════════════════════════════════════
window.copyPayoutStc = function(n) {
    if (!n) return;
    navigator.clipboard.writeText(n).then(
        () => showToast('نُسخ الرقم: ' + n, 'suc'),
        () => showToast('فشل النسخ', 'err')
    );
};

window.openPayoutClaim = async function(id) {
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    if (!confirm('استلم هذا الطلب لمعالجته؟ (سيتغيّر إلى "قيد المعالجة")')) return;
    try {
        if (isPreview) { showToast('(معاينة) تم الاستلام', 'suc'); loadPayouts(); return; }
        const { sb } = window.A;
        const { data, error } = await sb.rpc('admin_claim_payout', { p_payout_id: id });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشلت العملية');
        showToast('تم الاستلام — جاهز للمعالجة', 'suc');
        loadPayouts();
    } catch(e) { showToast('خطأ: ' + (e.message||''), 'err'); }
};

window.openPayoutComplete = function(id, amount, stcNumber) {
    const body = `
    <div style="padding:4px 0">
        <div style="background:var(--suc-s);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:12px;margin-bottom:16px">
            <div style="font-size:12px;color:var(--i2);margin-bottom:4px">سترسل مبلغ</div>
            <div style="font-size:24px;font-weight:800;color:var(--suc)">${amount} ر.س</div>
            <div style="font-size:12px;color:var(--i2);margin-top:6px">إلى STC Pay: <b style="font-family:monospace">${esc(stcNumber)}</b></div>
        </div>
        <div class="form-field">
            <label class="form-label">مرجع التحويل من STC Pay <span style="color:var(--dng)">*</span></label>
            <input class="form-input" id="payoutCompleteRef" placeholder="مثال: STC-REF-99213 أو TXN-12345" autocomplete="off" style="font-family:monospace">
            <div style="font-size:11px;color:var(--i3);margin-top:4px">رقم المرجع من تطبيق STC Pay — لازم للمراجعة المالية</div>
        </div>
        <div style="background:var(--warn-s,#FEFCE8);border:1px solid #FDE68A;border-radius:8px;padding:10px;margin-top:12px;font-size:12px;color:#92400E">
            ⚠️ تأكّد من إتمام التحويل في STC Pay <u>قبل</u> الضغط على تأكيد — بعد الحفظ لا يمكن التراجع بسهولة
        </div>
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
                  <button class="btn btn-pri" style="background:var(--suc);border-color:var(--suc)" onclick="confirmPayoutComplete('${id}')">تأكيد الإتمام</button>`;
    openModal('إتمام صرف ' + amount + ' ر.س', body, foot);
    setTimeout(()=>document.getElementById('payoutCompleteRef')?.focus(), 100);
};

window.confirmPayoutComplete = async function(id) {
    const ref = (document.getElementById('payoutCompleteRef').value || '').trim();
    if (ref.length < 3) return showToast('مرجع التحويل مطلوب (3 أحرف على الأقل)', 'err');
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    try {
        if (isPreview) { closeModal(); showToast('(معاينة) تم الإتمام: ' + ref, 'suc'); loadPayouts(); return; }
        const { sb } = window.A;
        const { data, error } = await sb.rpc('admin_complete_payout', { p_payout_id: id, p_transfer_ref: ref });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشلت العملية');
        closeModal();
        showToast('✓ تم الإتمام — ' + data.amount + ' ر.س (' + ref + ')', 'suc');
        loadPayouts();
    } catch(e) { showToast('خطأ: ' + (e.message||''), 'err'); }
};

window.openPayoutReject = function(id, amount) {
    const body = `
    <div style="padding:4px 0">
        <div style="background:var(--dng-s);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;margin-bottom:16px">
            <div style="font-size:13px;color:var(--dng);font-weight:700">سيتم رفض طلب بمبلغ ${amount} ر.س</div>
            <div style="font-size:12px;color:var(--i2);margin-top:4px">الرصيد سيُرجَع تلقائياً لحساب المُحيل ويقدر يطلب صرف جديد</div>
        </div>
        <div class="form-field">
            <label class="form-label">سبب الرفض <span style="color:var(--dng)">*</span></label>
            <textarea class="form-textarea" id="payoutRejectReason" rows="3" placeholder="مثال: حسابات مكرّرة، IP واحد، معلومات مزيفة..."></textarea>
            <div style="font-size:11px;color:var(--i3);margin-top:4px">سيظهر السبب في سجلّ النظام (لكن <b>لن</b> يُرسل للمستخدم تلقائياً — تواصل معه بالواتساب لو احتاج توضيح)</div>
        </div>
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
                  <button class="btn btn-pri" style="background:var(--dng);border-color:var(--dng)" onclick="confirmPayoutReject('${id}')">تأكيد الرفض</button>`;
    openModal('رفض طلب صرف', body, foot);
    setTimeout(()=>document.getElementById('payoutRejectReason')?.focus(), 100);
};

window.confirmPayoutReject = async function(id) {
    const reason = (document.getElementById('payoutRejectReason').value || '').trim();
    if (reason.length < 3) return showToast('سبب الرفض مطلوب (3 أحرف على الأقل)', 'err');
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    try {
        if (isPreview) { closeModal(); showToast('(معاينة) تم الرفض', 'suc'); loadPayouts(); return; }
        const { sb } = window.A;
        const { data, error } = await sb.rpc('admin_reject_payout', { p_payout_id: id, p_reason: reason });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشلت العملية');
        closeModal();
        showToast('تم الرفض — أُرجع ' + (data.restored_referrals||0) + ' إحالة لرصيد المستخدم', 'suc');
        loadPayouts();
    } catch(e) { showToast('خطأ: ' + (e.message||''), 'err'); }
};

})();
