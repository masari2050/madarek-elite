// ═══════════════════════════════════════════════════════════════
// invoice-handler.js — نظام الفوترة الضريبي
// يعتمد على متغير sb (Supabase client) الموجود في الصفحة
// لا يعدّل أي كود موجود — يُستدعى بعد نجاح الدفع فقط
// ═══════════════════════════════════════════════════════════════

/**
 * حفظ فاتورة ضريبية بعد نجاح الدفع
 * @param {Object} paymentData بيانات الدفع
 * @param {string} paymentData.userId معرّف المستخدم
 * @param {string} paymentData.customerName اسم العميل
 * @param {string} paymentData.customerPhone رقم الجوال (اختياري)
 * @param {string} paymentData.planName اسم الخطة (شهري/سنوي)
 * @param {number} paymentData.totalAmount المبلغ الإجمالي شامل الضريبة
 * @param {string} paymentData.paymentId معرّف الدفع من MyFatoorah
 * @returns {Object} { invoiceId, invoiceNumber } أو null عند الفشل
 */
async function saveInvoice(paymentData) {
  try {
    // التحقق من البيانات المطلوبة
    if (!paymentData || !paymentData.userId || !paymentData.totalAmount) {
      console.warn('[invoice-handler] بيانات ناقصة — ما نقدر ننشئ فاتورة');
      return null;
    }

    // استدعاء الـ RPC في Supabase
    var { data, error } = await sb.rpc('create_invoice', {
      p_user_id: paymentData.userId,
      p_customer_name: paymentData.customerName || 'عميل',
      p_customer_phone: paymentData.customerPhone || null,
      p_plan_name: paymentData.planName || 'اشتراك',
      p_total_amount: paymentData.totalAmount,
      p_payment_id: paymentData.paymentId || null
    });

    if (error) {
      console.error('[invoice-handler] خطأ في إنشاء الفاتورة:', error.message);
      return null;
    }

    if (data && data.success) {
      console.log('[invoice-handler] ✅ تم إنشاء الفاتورة:', data.invoice_number);
      return {
        invoiceId: data.invoice_id,
        invoiceNumber: data.invoice_number,
        beforeTax: data.before_tax,
        tax: data.tax,
        total: data.total
      };
    }

    console.warn('[invoice-handler] الـ RPC رجع بدون نجاح:', data);
    return null;

  } catch (err) {
    // الفاتورة مش حرجة — لا نوقف تجربة المستخدم
    console.error('[invoice-handler] استثناء:', err);
    return null;
  }
}
