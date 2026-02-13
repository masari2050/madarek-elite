// بنك الأسئلة - معادلات رياضية واضحة
// ملاحظة: الضرب × بدلاً من x، والقسمة ÷ أو /

const questionsBank = [
    // القسم الأول: الجبر والمعادلات
    {
        id: 1,
        subject: 'الجبر',
        difficulty: 'easy',
        question: 'حل المعادلة: 5 × س = 25',
        equation: '5 × س = 25',
        options: ['س = 5', 'س = 10', 'س = 20', 'س = 30'],
        correctAnswer: 0,
        explanation: 'نقسم الطرفين على 5، فيكون: س = 25 ÷ 5 = 5'
    },
    {
        id: 2,
        subject: 'الجبر',
        difficulty: 'easy',
        question: 'حل المعادلة: س + 12 = 20',
        equation: 'س + 12 = 20',
        options: ['س = 6', 'س = 8', 'س = 10', 'س = 12'],
        correctAnswer: 1,
        explanation: 'نطرح 12 من الطرفين، فيكون: س = 20 - 12 = 8'
    },
    {
        id: 3,
        subject: 'الجبر',
        difficulty: 'medium',
        question: 'حل المعادلة: 3 × س - 7 = 14',
        equation: '3 × س - 7 = 14',
        options: ['س = 5', 'س = 7', 'س = 9', 'س = 11'],
        correctAnswer: 1,
        explanation: 'نضيف 7 للطرفين: 3 × س = 21، ثم نقسم على 3: س = 7'
    },
    {
        id: 4,
        subject: 'الجبر',
        difficulty: 'medium',
        question: 'إذا كان 2 × س + 5 = 3 × س - 2، فما قيمة س؟',
        equation: '2 × س + 5 = 3 × س - 2',
        options: ['س = 5', 'س = 7', 'س = 9', 'س = 11'],
        correctAnswer: 1,
        explanation: 'نجمع الحدود المتشابهة: 5 + 2 = 3 × س - 2 × س، فيكون 7 = س'
    },
    {
        id: 5,
        subject: 'الجبر',
        difficulty: 'hard',
        question: 'حل المعادلة: (س + 3) ÷ 2 = 8',
        equation: '(س + 3) ÷ 2 = 8',
        options: ['س = 11', 'س = 13', 'س = 15', 'س = 17'],
        correctAnswer: 1,
        explanation: 'نضرب الطرفين في 2: س + 3 = 16، ثم نطرح 3: س = 13'
    },

    // القسم الثاني: النسبة والتناسب
    {
        id: 6,
        subject: 'النسبة والتناسب',
        difficulty: 'easy',
        question: 'إذا كانت النسبة 3 : 6 تساوي النسبة س : 12، فما قيمة س؟',
        equation: '3 : 6 = س : 12',
        options: ['س = 4', 'س = 6', 'س = 8', 'س = 10'],
        correctAnswer: 1,
        explanation: 'التناسب: 3 × 12 = 6 × س، فيكون س = 36 ÷ 6 = 6'
    },
    {
        id: 7,
        subject: 'النسبة والتناسب',
        difficulty: 'medium',
        question: 'نسبة الطلاب إلى الطالبات في فصل هي 2 : 3، إذا كان عدد الطلاب 14، فكم عدد الطالبات؟',
        equation: '2 : 3 = 14 : س',
        options: ['18', '21', '24', '27'],
        correctAnswer: 1,
        explanation: 'التناسب: 2 × س = 3 × 14، فيكون س = 42 ÷ 2 = 21'
    },
    {
        id: 8,
        subject: 'النسبة والتناسب',
        difficulty: 'medium',
        question: 'إذا كانت 40٪ من عدد تساوي 80، فما هو العدد؟',
        equation: '40٪ × س = 80',
        options: ['160', '180', '200', '220'],
        correctAnswer: 2,
        explanation: '0.4 × س = 80، فيكون س = 80 ÷ 0.4 = 200'
    },

    // القسم الثالث: الهندسة
    {
        id: 9,
        subject: 'الهندسة',
        difficulty: 'easy',
        question: 'مساحة مستطيل طوله 8 سم وعرضه 5 سم تساوي:',
        equation: 'المساحة = الطول × العرض',
        options: ['30 سم²', '35 سم²', '40 سم²', '45 سم²'],
        correctAnswer: 2,
        explanation: 'المساحة = 8 × 5 = 40 سم²'
    },
    {
        id: 10,
        subject: 'الهندسة',
        difficulty: 'easy',
        question: 'محيط مربع طول ضلعه 7 سم يساوي:',
        equation: 'المحيط = 4 × طول الضلع',
        options: ['21 سم', '24 سم', '28 سم', '32 سم'],
        correctAnswer: 2,
        explanation: 'المحيط = 4 × 7 = 28 سم'
    },
    {
        id: 11,
        subject: 'الهندسة',
        difficulty: 'medium',
        question: 'إذا كان محيط مستطيل 30 سم وطوله 10 سم، فما عرضه؟',
        equation: 'المحيط = 2 × (الطول + العرض)',
        options: ['3 سم', '5 سم', '7 سم', '9 سم'],
        correctAnswer: 1,
        explanation: '30 = 2 × (10 + العرض)، فيكون العرض = 5 سم'
    },
    {
        id: 12,
        subject: 'الهندسة',
        difficulty: 'hard',
        question: 'مساحة دائرة نصف قطرها 7 سم تساوي: (π = 22/7)',
        equation: 'المساحة = π × نق²',
        options: ['144 سم²', '154 سم²', '164 سم²', '174 سم²'],
        correctAnswer: 1,
        explanation: 'المساحة = (22 ÷ 7) × 7 × 7 = 154 سم²'
    },

    // القسم الرابع: الأعداد والعمليات
    {
        id: 13,
        subject: 'الأعداد',
        difficulty: 'easy',
        question: 'ما ناتج: 15 + 23 - 8',
        equation: '15 + 23 - 8',
        options: ['28', '30', '32', '34'],
        correctAnswer: 1,
        explanation: '15 + 23 = 38، ثم 38 - 8 = 30'
    },
    {
        id: 14,
        subject: 'الأعداد',
        difficulty: 'easy',
        question: 'ما ناتج: 7 × 8',
        equation: '7 × 8',
        options: ['48', '52', '56', '60'],
        correctAnswer: 2,
        explanation: '7 × 8 = 56'
    },
    {
        id: 15,
        subject: 'الأعداد',
        difficulty: 'medium',
        question: 'ما ناتج: 144 ÷ 12',
        equation: '144 ÷ 12',
        options: ['10', '11', '12', '13'],
        correctAnswer: 2,
        explanation: '144 ÷ 12 = 12'
    },
    {
        id: 16,
        subject: 'الأعداد',
        difficulty: 'medium',
        question: 'ما ناتج: 5² + 3²',
        equation: '5² + 3²',
        options: ['30', '32', '34', '36'],
        correctAnswer: 2,
        explanation: '5² = 25، و 3² = 9، فيكون 25 + 9 = 34'
    },
    {
        id: 17,
        subject: 'الأعداد',
        difficulty: 'hard',
        question: 'ما ناتج: (8 + 4) × 3 - 6',
        equation: '(8 + 4) × 3 - 6',
        options: ['28', '30', '32', '34'],
        correctAnswer: 1,
        explanation: 'الأقواس أولاً: 12 × 3 = 36، ثم 36 - 6 = 30، الجواب الصحيح 30 وليس 28'
    },

    // القسم الخامس: الكسور والعشرية
    {
        id: 18,
        subject: 'الكسور',
        difficulty: 'easy',
        question: 'ما ناتج: 1/2 + 1/4',
        equation: '1/2 + 1/4',
        options: ['1/4', '2/4', '3/4', '4/4'],
        correctAnswer: 2,
        explanation: '1/2 = 2/4، فيكون 2/4 + 1/4 = 3/4'
    },
    {
        id: 19,
        subject: 'الكسور',
        difficulty: 'medium',
        question: 'ما ناتج: 3/4 × 2/3',
        equation: '3/4 × 2/3',
        options: ['1/2', '2/3', '3/5', '5/6'],
        correctAnswer: 0,
        explanation: '(3 × 2) ÷ (4 × 3) = 6 ÷ 12 = 1/2'
    },
    {
        id: 20,
        subject: 'الكسور',
        difficulty: 'medium',
        question: 'ما ناتج: 0.5 + 0.25',
        equation: '0.5 + 0.25',
        options: ['0.65', '0.70', '0.75', '0.80'],
        correctAnswer: 2,
        explanation: '0.5 + 0.25 = 0.75'
    },

    // القسم السادس: المسائل الكلامية
    {
        id: 21,
        subject: 'مسائل كلامية',
        difficulty: 'medium',
        question: 'اشترى أحمد 3 كتب بسعر 45 ريال، كم سعر الكتاب الواحد؟',
        equation: 'سعر الكتاب = 45 ÷ 3',
        options: ['12 ريال', '15 ريال', '18 ريال', '21 ريال'],
        correctAnswer: 1,
        explanation: 'سعر الكتاب الواحد = 45 ÷ 3 = 15 ريال'
    },
    {
        id: 22,
        subject: 'مسائل كلامية',
        difficulty: 'medium',
        question: 'سيارة تسير بسرعة 80 كم/ساعة، كم كيلومتر تقطع في 3 ساعات؟',
        equation: 'المسافة = السرعة × الزمن',
        options: ['200 كم', '220 كم', '240 كم', '260 كم'],
        correctAnswer: 2,
        explanation: 'المسافة = 80 × 3 = 240 كم'
    },
    {
        id: 23,
        subject: 'مسائل كلامية',
        difficulty: 'hard',
        question: 'مع سارة 120 ريال، أنفقت 1/4 المبلغ على كتاب و 1/3 على قلم، كم بقي معها؟',
        equation: 'الباقي = 120 - (120 × 1/4) - (120 × 1/3)',
        options: ['40 ريال', '45 ريال', '50 ريال', '55 ريال'],
        correctAnswer: 2,
        explanation: 'أنفقت: 30 + 40 = 70 ريال، الباقي: 120 - 70 = 50 ريال'
    },
    {
        id: 24,
        subject: 'مسائل كلامية',
        difficulty: 'hard',
        question: 'مزرعة فيها 24 دجاجة وأرنب، عدد الأرجل الكلي 66، كم عدد الأرانب؟',
        equation: 'دجاج (2 رجل) + أرانب (4 أرجل) = 66',
        options: ['7', '8', '9', '10'],
        correctAnswer: 2,
        explanation: 'لو كلها دجاج: 24 × 2 = 48، الفرق: 66 - 48 = 18، عدد الأرانب = 18 ÷ 2 = 9'
    },

    // القسم السابع: الإحصاء
    {
        id: 25,
        subject: 'الإحصاء',
        difficulty: 'easy',
        question: 'المتوسط الحسابي للأعداد: 5، 10، 15 هو:',
        equation: 'المتوسط = (5 + 10 + 15) ÷ 3',
        options: ['8', '10', '12', '15'],
        correctAnswer: 1,
        explanation: 'المتوسط = 30 ÷ 3 = 10'
    },
    {
        id: 26,
        subject: 'الإحصاء',
        difficulty: 'medium',
        question: 'الوسيط للأعداد: 3، 7، 5، 9، 11 هو:',
        equation: 'الوسيط = القيمة الوسطى بعد الترتيب',
        options: ['5', '7', '9', '11'],
        correctAnswer: 1,
        explanation: 'الترتيب: 3، 5، 7، 9، 11، الوسيط = 7'
    },
    {
        id: 27,
        subject: 'الإحصاء',
        difficulty: 'medium',
        question: 'المنوال للأعداد: 2، 5، 5، 7، 9، 5، 3 هو:',
        equation: 'المنوال = العدد الأكثر تكراراً',
        options: ['2', '3', '5', '7'],
        correctAnswer: 2,
        explanation: 'العدد 5 تكرر 3 مرات، فهو المنوال'
    },

    // أسئلة إضافية متنوعة
    {
        id: 28,
        subject: 'الجبر',
        difficulty: 'hard',
        question: 'إذا كان س² = 64، فما قيمة س؟ (اختر الموجبة)',
        equation: 'س² = 64',
        options: ['6', '7', '8', '9'],
        correctAnswer: 2,
        explanation: 'الجذر التربيعي لـ 64 هو 8'
    },
    {
        id: 29,
        subject: 'الأعداد',
        difficulty: 'easy',
        question: 'ما العدد الأولي من بين الأعداد التالية؟',
        equation: 'العدد الأولي يقبل القسمة على نفسه و 1 فقط',
        options: ['12', '15', '17', '18'],
        correctAnswer: 2,
        explanation: '17 عدد أولي، لا يقبل القسمة إلا على نفسه و 1'
    },
    {
        id: 30,
        subject: 'الهندسة',
        difficulty: 'medium',
        question: 'مثلث قائم الزاوية طول ضلعيه القائمين 3 سم و 4 سم، فما طول الوتر؟',
        equation: 'الوتر² = 3² + 4²',
        options: ['4 سم', '5 سم', '6 سم', '7 سم'],
        correctAnswer: 1,
        explanation: 'بفيثاغورس: الوتر² = 9 + 16 = 25، فالوتر = 5 سم'
    }
];

// دالة للحصول على أسئلة عشوائية
function getRandomQuestions(count = 10) {
    const shuffled = [...questionsBank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// دالة للحصول على أسئلة حسب الصعوبة
function getQuestionsByDifficulty(difficulty, count = 10) {
    const filtered = questionsBank.filter(q => q.difficulty === difficulty);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, filtered.length));
}

// دالة للحصول على أسئلة حسب الموضوع
function getQuestionsBySubject(subject, count = 10) {
    const filtered = questionsBank.filter(q => q.subject === subject);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, filtered.length));
}

// دالة للحصول على سؤال واحد بناءً على ID
function getQuestionById(id) {
    return questionsBank.find(q => q.id === id);
}

// دالة للحصول على أسئلة الأخطاء السابقة
function getMistakesQuestions() {
    const mistakes = JSON.parse(localStorage.getItem('masari_mistakes') || '[]');
    return mistakes.map(id => getQuestionById(id)).filter(q => q !== undefined);
}
