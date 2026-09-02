// scripts/admin_email_notifier.js - Bahrain Civil Defense Multi-Status Admin Email Engine
const nodemailer = require('nodemailer');

function createEmailTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Dispatches an official Admin Alert Email for any Application Lifecycle Status.
 * 
 * Supported Statuses:
 * - 'Submitted' / 'New Application'
 * - 'Modification Resubmitted' / 'User Updated'
 * - 'Modification Requested'
 * - 'Approved'
 * - 'Rejected'
 */
async function sendAdminApplicationNotification(appData) {
  const adminEmail = process.env.ADMIN_EMAIL || 'gdcdvirtual@gmail.com';
  const appId = appData.appId || 'APP-UNKNOWN';
  const serviceName = appData.serviceName || 'خدمة الدفاع المدني';
  const clientName = `${appData.firstName || ''} ${appData.lastName || ''}`.trim() || appData.clientName || 'عزيزنا المتعامل';
  const phone = appData.whatsapp || appData.phone || 'غير متوفر';
  const applicantEmail = appData.email || 'غير متوفر';
  const trackingLink = appData.trackingLink || `http://localhost:3000/track?id=${appId}`;
  const attachmentLink = appData.attachmentLink || '';
  const certificateLink = appData.certificateLink || `http://localhost:3000/receipt?id=${appId}`;
  const quickActionLink = appData.quickActionLink || `http://localhost:3000/admin/quick-action?id=${appId}&key=${process.env.ADMIN_SECRET_KEY || 'cd_admin_secret_key_2026'}`;
  
  // Status normalization
  let status = appData.status || (appData.isNewApplication ? 'Submitted' : 'Modification Resubmitted');
  if (status === 'Pending' && appData.isNewApplication) status = 'Submitted';

  let subject = '';
  let badgeColor = '';
  let badgeBorder = '';
  let headerTitle = '';
  let badgeSubtitle = '';
  let highlightSection = '';

  switch (status) {
    case 'Submitted':
    case 'New Application':
      subject = `⚡ طلب خدمة دفاع مدني جديد: ${appId} - ${clientName}`;
      badgeColor = 'rgba(56, 189, 248, 0.12)';
      badgeBorder = '#38BDF8';
      headerTitle = '⚡ إشعار الإدارة: استلام طلب خدمة جديد';
      badgeSubtitle = 'تم تسجيل معاملة جديدة في النظام وتحتاج إلى تدقيق ضابط الدفاع المدني المختص.';
      break;

    case 'Modification Resubmitted':
    case 'User Updated':
      subject = `⚠️ تحديث بيانات ومستندات معاملة: ${appId} - ${clientName}`;
      badgeColor = 'rgba(245, 158, 11, 0.12)';
      badgeBorder = '#F59E0B';
      headerTitle = '⚠️ إشعار الإدارة: رد وتحديث مستندات من المتعامل';
      badgeSubtitle = 'قام المتعامل بإعادة رفع المخططات وتحديث بيانات المعاملة بناءً على الملاحظات.';
      if (appData.modificationDetails || appData.userModificationResponse || appData.notes) {
        highlightSection = `
          <div style="background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(245, 158, 11, 0.3); padding: 14px; border-radius: 8px; margin: 16px 0;">
            <strong style="color: #FBBF24;">ملاحظات ورد المتعامل على التعديل:</strong>
            <p style="margin: 6px 0 0 0; color: #E2E8F0; line-height: 1.5;">${appData.modificationDetails || appData.userModificationResponse || appData.notes}</p>
          </div>
        `;
      }
      break;

    case 'Modification Requested':
      subject = `📋 إشعار بطلب تعديل مستندات: ${appId} - ${clientName}`;
      badgeColor = 'rgba(234, 179, 8, 0.12)';
      badgeBorder = '#EAB308';
      headerTitle = '📋 إشعار الإدارة: تم طلب تعديل مستندات من المتعامل';
      badgeSubtitle = 'تم إخطار المتعامل بضرورة تعديل المخططات أو استكمال البيانات.';
      if (appData.reason || appData.modificationDetails) {
        highlightSection = `
          <div style="background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(234, 179, 8, 0.3); padding: 14px; border-radius: 8px; margin: 16px 0;">
            <strong style="color: #FDE047;">الملاحظات والتعليمات المرسلة للمتعامل:</strong>
            <p style="margin: 6px 0 0 0; color: #E2E8F0; line-height: 1.5;">${appData.reason || appData.modificationDetails}</p>
          </div>
        `;
      }
      break;

    case 'Approved':
      subject = `✅ تم اعتماد المعاملة وإصدار الشهادة: ${appId} - ${clientName}`;
      badgeColor = 'rgba(34, 197, 94, 0.12)';
      badgeBorder = '#22C55E';
      headerTitle = '✅ إشعار الإدارة: تم اعتماد المعاملة وإصدار الشهادة الرسمية';
      badgeSubtitle = 'تم اعتماد المعاملة بنجاح وتوليد شهادة الاستيفاء والترخيص الإلكتروني بالباركود الذكي (QR Code).';
      highlightSection = `
        <div style="margin: 20px 0; text-align: center;">
          <a href="${certificateLink}" target="_blank" style="background: #16A34A; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.95rem; display: inline-block; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);">
            📜 معاينة وتنزيل شهادة الاعتماد الرسمية (PDF & QR)
          </a>
        </div>
      `;
      break;

    case 'Rejected':
      subject = `❌ إشعار برفض المعاملة: ${appId} - ${clientName}`;
      badgeColor = 'rgba(239, 68, 68, 0.12)';
      badgeBorder = '#EF4444';
      headerTitle = '❌ إشعار الإدارة: تم رفض المعاملة';
      badgeSubtitle = 'تم تسجيل قرار عدم الموافقة على الطلب وإشعار المتعامل رسمياً.';
      if (appData.reason || appData.modificationDetails) {
        highlightSection = `
          <div style="background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(239, 68, 68, 0.3); padding: 14px; border-radius: 8px; margin: 16px 0;">
            <strong style="color: #F87171;">أسباب الرفض المسجلة في القرار:</strong>
            <p style="margin: 6px 0 0 0; color: #E2E8F0; line-height: 1.5;">${appData.reason || appData.modificationDetails}</p>
          </div>
        `;
      }
      break;

    default:
      subject = `📌 تحديث حالة المعاملة: ${appId} (${status})`;
      badgeColor = 'rgba(148, 163, 184, 0.12)';
      badgeBorder = '#94A3B8';
      headerTitle = `📌 إشعار الإدارة: تحديث حالة المعاملة إلى (${status})`;
      badgeSubtitle = 'تم تحديث حالة المعاملة في قاعدة بيانات الدفاع المدني.';
      break;
  }

  const htmlBody = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; text-align: right; background-color: #0F172A; color: #F8FAFC; padding: 28px 20px; border-radius: 12px; max-width: 620px; margin: 0 auto; border: 1.5px solid #F59E0B; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #F59E0B; margin: 0 0 6px 0; font-size: 1.35rem;">الإدارة العامة للدفاع المدني - مملكة البحرين</h2>
        <p style="color: #94A3B8; margin: 0; font-size: 0.85rem; letter-spacing: 0.5px;">GENERAL DIRECTORATE OF CIVIL DEFENSE - ADMIN ALERT</p>
      </div>

      <div style="background: ${badgeColor}; border: 1px solid ${badgeBorder}; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
        <h3 style="color: ${badgeBorder}; margin: 0; font-size: 1.15rem;">${headerTitle}</h3>
        <p style="color: #E2E8F0; margin: 6px 0 0 0; font-size: 0.9rem;">${badgeSubtitle}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.92rem;">
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 10px 0; color: #94A3B8; width: 140px; font-weight: bold;">رقم المعاملة:</td>
          <td style="padding: 10px 0; font-weight: bold; color: #38BDF8; font-family: monospace; font-size: 1.05rem;">${appId}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 10px 0; color: #94A3B8; font-weight: bold;">نوع الخدمة:</td>
          <td style="padding: 10px 0; color: #FFFFFF; font-weight: bold;">${serviceName}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 10px 0; color: #94A3B8; font-weight: bold;">اسم مقدم الطلب:</td>
          <td style="padding: 10px 0; color: #FFFFFF;">${clientName}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 10px 0; color: #94A3B8; font-weight: bold;">حالة المعاملة:</td>
          <td style="padding: 10px 0; font-weight: bold; color: ${badgeBorder};">${status}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 10px 0; color: #94A3B8; font-weight: bold;">رقم الهاتف:</td>
          <td style="padding: 10px 0; color: #FFFFFF; direction: ltr; text-align: right;">
            <a href="tel:+${phone.replace(/[^0-9]/g, '')}" style="color: #38BDF8; text-decoration: none;">+${phone.replace(/[^0-9]/g, '')}</a>
            <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" style="background: #25D366; color: #FFFFFF; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; text-decoration: none; margin-right: 8px; font-weight: bold;">واتساب 💬</a>
          </td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 10px 0; color: #94A3B8; font-weight: bold;">البريد الإلكتروني:</td>
          <td style="padding: 10px 0; color: #FFFFFF; direction: ltr; text-align: right;">
            <a href="mailto:${applicantEmail}" style="color: #38BDF8; text-decoration: none;">${applicantEmail}</a>
          </td>
        </tr>
        ${appData.paymentMethod ? `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 10px 0; color: #94A3B8; font-weight: bold;">طريقة الدفع:</td>
          <td style="padding: 10px 0; color: #FFFFFF;">${appData.paymentMethod}</td>
        </tr>` : ''}
      </table>

      ${highlightSection}

      ${attachmentLink ? `
      <div style="margin: 16px 0; text-align: center;">
        <a href="${attachmentLink}" target="_blank" style="background: #0284C7; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.9rem; display: inline-block;">
          📄 معاينة وتنزيل المستند والمخطط المرفوع (PDF)
        </a>
      </div>` : ''}

      <div style="margin: 24px 0 10px 0; text-align: center;">
        <a href="${quickActionLink}" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);">
          ⚡ فتح صفحة الإجراء السريع والاعتماد للمسؤول
        </a>
      </div>

      <div style="text-align: center; margin-top: 14px;">
        <a href="${trackingLink}" style="color: #94A3B8; font-size: 0.82rem; text-decoration: underline;">
          رابط بوابة تتبع المتعامل المباشرة
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0 14px 0;" />
      <p style="font-size: 0.78rem; color: #64748B; margin: 0; text-align: center;">
        هذا إشعار آلي داخلي صادر عن منصة خدمات الدفاع المدني الذكية بمملكة البحرين للمسؤول المعتمد (${adminEmail}).
      </p>
    </div>
  `;

  const transporter = createEmailTransporter();

  if (!transporter) {
    console.log(`[Admin Email Engine] ℹ️ Outbound SMTP not active in .env. Admin notification prepared for <${adminEmail}> [Status: ${status}].`);
    return {
      status: 'simulated_or_unconfigured',
      recipient: adminEmail,
      appStatus: status,
      subject,
      reason: 'SMTP_USER / SMTP_PASS not set in environment.'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Civil Defense Alerts" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject,
      html: htmlBody
    });

    console.log(`[Admin Email Engine] ✉️ Direct Admin Notification Email delivered to ${adminEmail} for status (${status}) (MessageId: ${info.messageId}) ✅`);
    return { status: 'sent', messageId: info.messageId, recipient: adminEmail, appStatus: status, subject };
  } catch (err) {
    console.error(`[Admin Email Engine] ❌ SMTP Email Delivery failed for ${adminEmail} [Status: ${status}]:`, err.message);
    return { status: 'failed', error: err.message, recipient: adminEmail, appStatus: status };
  }
}

/**
 * Dispatches an official Citizen/Applicant Email Notification whenever the application
 * status changes (specifically 'Modification Requested', 'Approved', 'Rejected').
 */
async function sendUserApplicationStatusEmail(appData) {
  const userEmail = appData.email || appData.userEmail || process.env.ADMIN_EMAIL || 'gdcdvirtual@gmail.com';
  const appId = appData.appId || 'APP-UNKNOWN';
  const serviceName = appData.serviceName || 'خدمة الدفاع المدني';
  const clientName = `${appData.firstName || ''} ${appData.lastName || ''}`.trim() || appData.clientName || 'عزيزنا المتعامل';
  const trackingLink = appData.trackingLink || `http://localhost:3000/track?id=${appId}`;
  const certificateLink = appData.certificateLink || `http://localhost:3000/receipt?id=${appId}`;
  const status = appData.status || 'Modification Requested';
  const reason = appData.reason || appData.modificationDetails || '';

  let subject = '';
  let badgeColor = '';
  let badgeBorder = '';
  let headerTitle = '';
  let mainActionBtn = '';
  let contentHtml = '';

  const rawStatus = (status || '').trim();
  const normalizedStatus = rawStatus.toLowerCase();

  const isUnderReview = normalizedStatus.includes('review') || normalizedStatus.includes('مراجعة') || normalizedStatus.includes('تدقيق') || normalizedStatus.includes('دراسة');
  const isInProgress = normalizedStatus.includes('progress') || normalizedStatus.includes('معالجة') || normalizedStatus.includes('إجراء');
  const isInspection = normalizedStatus.includes('inspect') || normalizedStatus.includes('معاينة') || normalizedStatus.includes('فحص');
  const isModRequested = normalizedStatus.includes('modification') || normalizedStatus.includes('تعديل') || normalizedStatus.includes('استكمال');
  const isModResubmitted = normalizedStatus.includes('resubmit') || normalizedStatus.includes('إعادة') || normalizedStatus.includes('تحديث');
  const isApproved = normalizedStatus.includes('approv') || normalizedStatus.includes('قبول') || normalizedStatus.includes('اعتماد') || normalizedStatus.includes('مكتمل');
  const isRejected = normalizedStatus.includes('reject') || normalizedStatus.includes('رفض') || normalizedStatus.includes('ملغي') || normalizedStatus.includes('غير مستوف');

  if (isModRequested && !isModResubmitted) {
    subject = `⚠️ تحديث عاجل: مطلوب تعديل مستندات طلب رقم ${appId} - الدفاع المدني | Action Required: Modification Requested (${appId})`;
    badgeColor = 'rgba(245, 158, 11, 0.12)';
    badgeBorder = '#F59E0B';
    headerTitle = '⚠️ مطلوب تعديل بيانات / مستندات على طلب الخدمة';
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        تود الإدارة العامة للدفاع المدني بمملكة البحرين إفادتكم بضرورة تعديل المستندات أو استكمال البيانات الخاصة بطلبكم رقم (<strong style="color: #38BDF8;">${appId}</strong>) لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>).
      </p>
      <div style="background: rgba(30, 41, 59, 0.9); border-right: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <div style="font-weight: bold; color: #FDE047; font-size: 1rem; margin-bottom: 6px;">
          ملاحظات الإدارة العامة للدفاع المدني:
        </div>
        <div style="color: #FFFFFF; font-size: 0.95rem; line-height: 1.6;">
          ${reason || 'يرجى مراجعة صفحة المتابعة لمراجعة الملاحظات'}
        </div>
      </div>
      <p style="font-size: 0.95rem; color: #CBD5E1; line-height: 1.6;">
        بإمكانك مراجعة كافة بيانات الطلب وإعادة إرفاق المخططات المطلوبة فوراً عبر الضغط على الزر أدناه دون الحاجة لتقديم طلب جديد:
      </p>
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.45); border: 1px solid rgba(56, 189, 248, 0.4);">
          ✏️ اضغط هنا لتعديل وإعادة رفع المستندات فوراً
        </a>
      </div>
    `;
  } else if (isUnderReview) {
    subject = `🔍 تحديث حالة طلب الخدمة رقم ${appId} - قيد المراجعة والتدقيق الفني | Status: Under Review (${appId})`;
    badgeColor = 'rgba(2, 132, 199, 0.12)';
    badgeBorder = '#0284C7';
    headerTitle = '🔍 طلبكم قيد المراجعة والتدقيق الفني لدى المختصين';
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        تود الإدارة العامة للدفاع المدني إفادتكم بأن طلبكم رقم (<strong style="color: #38BDF8;">${appId}</strong>) لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>) قد تم تحويله إلى مرحلة: <strong style="color: #38BDF8;">قيد المراجعة والتدقيق الفني (Under Review)</strong>.
      </p>
      <p style="font-size: 0.95rem; color: #CBD5E1; line-height: 1.6;">
        يقوم المهندسون والمختصون حالياً بدراسة المخططات والبيانات المرفقة للتحقق من استيفاء كافة اشتراطات ومعايير السلامة والوقاية من الحريق.
      </p>
      ${reason ? `
      <div style="background: rgba(30, 41, 59, 0.9); border-right: 4px solid #0284C7; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <div style="font-weight: bold; color: #38BDF8; font-size: 1rem; margin-bottom: 6px;">
          ملاحظات قسم التدقيق الفني:
        </div>
        <div style="color: #FFFFFF; font-size: 0.95rem; line-height: 1.6;">
          ${reason}
        </div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.45); border: 1px solid rgba(56, 189, 248, 0.4);">
          🔍 متابعة وتتبع حالة المعاملة
        </a>
      </div>
    `;
  } else if (isInProgress) {
    subject = `⚙️ تحديث حالة طلب الخدمة رقم ${appId} - قيد المعالجة والإجراء | Status: In Progress (${appId})`;
    badgeColor = 'rgba(79, 70, 229, 0.12)';
    badgeBorder = '#6366F1';
    headerTitle = '⚙️ طلبكم قيد المعالجة واستكمال الإجراءات';
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        تود الإدارة العامة للدفاع المدني إفادتكم بأن طلبكم رقم (<strong style="color: #38BDF8;">${appId}</strong>) لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>) في مرحلة: <strong style="color: #818CF8;">قيد المعالجة والإجراء (In Progress)</strong>.
      </p>
      <p style="font-size: 0.95rem; color: #CBD5E1; line-height: 1.6;">
        يجري العمل على استكمال الإجراءات الإدارية والفنية الخاصة بمعاملتكم لدى الشعب والوحدات المختصة.
      </p>
      ${reason ? `
      <div style="background: rgba(30, 41, 59, 0.9); border-right: 4px solid #6366F1; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <div style="font-weight: bold; color: #818CF8; font-size: 1rem; margin-bottom: 6px;">
          ملاحظات المعاملة:
        </div>
        <div style="color: #FFFFFF; font-size: 0.95rem; line-height: 1.6;">
          ${reason}
        </div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%); color: #FFFFFF; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block;">
          🔍 تتبع حالة الطلب
        </a>
      </div>
    `;
  } else if (isInspection) {
    subject = `🏢 تحديث حالة طلب الخدمة رقم ${appId} - قيد المعاينة الميدانية | Status: Under Field Inspection (${appId})`;
    badgeColor = 'rgba(147, 51, 234, 0.12)';
    badgeBorder = '#A855F7';
    headerTitle = '🏢 جاري التنسيق للمعاينة والفحص الميداني للموقع';
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        تود الإدارة العامة للدفاع المدني إفادتكم بأن طلبكم رقم (<strong style="color: #38BDF8;">${appId}</strong>) لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>) قد تم تحويله إلى: <strong style="color: #C084FC;">المعاينة الميدانية (Under Inspection)</strong>.
      </p>
      <p style="font-size: 0.95rem; color: #CBD5E1; line-height: 1.6;">
        سيقوم مفتش الدفاع المدني بالتواصل معكم أو زيارة المنشأة للتحقق من جاهزية أنظمة الإطفاء والإنذار ومخارج الطوارئ.
      </p>
      ${reason ? `
      <div style="background: rgba(30, 41, 59, 0.9); border-right: 4px solid #A855F7; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <div style="font-weight: bold; color: #C084FC; font-size: 1rem; margin-bottom: 6px;">
          تعليمات وملاحظات المعاينة:
        </div>
        <div style="color: #FFFFFF; font-size: 0.95rem; line-height: 1.6;">
          ${reason}
        </div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: linear-gradient(135deg, #9333EA 0%, #7E22CE 100%); color: #FFFFFF; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block;">
          🔍 تتبع موعد وتفاصيل المعاينة
        </a>
      </div>
    `;
  } else if (isModResubmitted) {
    subject = `🔄 تأكيد استلام تعديلات طلب الخدمة رقم ${appId} - الدفاع المدني | Modifications Received (${appId})`;
    badgeColor = 'rgba(13, 148, 136, 0.12)';
    badgeBorder = '#14B8A6';
    headerTitle = '🔄 تم استلام التعديلات والمرفقات المحدثة بنجاح';
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        تم بحمد الله استلام المستندات والبيانات المحدثة لطلبكم رقم (<strong style="color: #38BDF8;">${appId}</strong>) لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>).
      </p>
      <p style="font-size: 0.95rem; color: #CBD5E1; line-height: 1.6;">
        يجري حالياً إعادة مراجعة وتدقيق المستندات المرفقة من قبل ضابط الدفاع المدني المختص.
      </p>
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #0D9488; color: #FFFFFF; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block;">
          🔍 متابعة حالة الطلب
        </a>
      </div>
    `;
  } else if (isApproved) {
    subject = `✅ تم قبول واعتماد طلب الخدمة رقم ${appId} - الدفاع المدني | Application Approved (${appId})`;
    badgeColor = 'rgba(34, 197, 94, 0.12)';
    badgeBorder = '#22C55E';
    headerTitle = '✅ تم اعتماد وتدقيق طلب الخدمة بنجاح';
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        يسر الإدارة العامة للدفاع المدني إفادتكم بأنه تم بحمد الله تدقيق واعتماد طلبكم رقم (<strong style="color: #38BDF8;">${appId}</strong>) لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>).
      </p>
      <p style="font-size: 0.95rem; color: #CBD5E1; line-height: 1.6;">
        تم إصدار شهادة الاستيفاء والترخيص الرسمي المعتمد والمزود برمز التحقق الذكي (QR Code).
      </p>
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${certificateLink}" target="_blank" style="background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: #FFFFFF; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block; box-shadow: 0 4px 18px rgba(22, 163, 74, 0.45); border: 1px solid rgba(74, 222, 128, 0.4);">
          📜 تحميل وطباعة شهادة الاعتماد الرسمية (PDF)
        </a>
      </div>
    `;
  } else if (isRejected) {
    subject = `❌ إشعار بخصوص طلب الخدمة رقم ${appId} - الدفاع المدني | Application Status Update (${appId})`;
    badgeColor = 'rgba(239, 68, 68, 0.12)';
    badgeBorder = '#EF4444';
    headerTitle = '❌ إشعار بعدم الموافقة على الطلب';
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        نأسف لإبلاغكم بأنه تعذر قبول طلبكم رقم (<strong style="color: #38BDF8;">${appId}</strong>) لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>).
      </p>
      ${reason ? `
      <div style="background: rgba(30, 41, 59, 0.9); border-right: 4px solid #EF4444; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <div style="font-weight: bold; color: #F87171; font-size: 1rem; margin-bottom: 6px;">
          أسباب عدم الموافقة:
        </div>
        <div style="color: #FFFFFF; font-size: 0.95rem; line-height: 1.6;">
          ${reason}
        </div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #334155; color: #FFFFFF; padding: 12px 28px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 0.95rem; display: inline-block;">
          🔍 عرض تفاصيل المعاملة
        </a>
      </div>
    `;
  } else if (normalizedStatus === 'submitted' || normalizedStatus === 'pending' || normalizedStatus === 'جديد' || normalizedStatus === 'تم الاستلام' || !rawStatus) {
    // New Application Submission Initial Confirmation
    subject = `تأكيد استلام طلب الخدمة - الدفاع المدني (رقم ${appId}) | Application Received (${appId})`;
    badgeColor = 'rgba(2, 132, 199, 0.12)';
    badgeBorder = '#0284C7';
    headerTitle = '📋 تم استلام طلب الخدمة بنجاح';
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        يسر الإدارة العامة للدفاع المدني إفادتكم بأنه تم بنجاح استلام طلبكم لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>) برقم المعاملة: (<strong style="color: #38BDF8;">${appId}</strong>).
      </p>
      <p style="font-size: 0.95rem; color: #CBD5E1; line-height: 1.6;">
        سيتم إشعاركم عبر البريد الإلكتروني فور قيام ضابط الدفاع المدني بمراجعة وتحديث حالة الطلب. بإمكانكم متابعة الطلب أو تعديل البيانات المرفوعة في أي وقت عبر بوابة التتبع المباشرة.
      </p>
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.45); border: 1px solid rgba(56, 189, 248, 0.4);">
          🔍 متابعة وتتبع حالة الطلب
        </a>
      </div>
    `;
  } else {
    // Dynamic Custom Status (Matches Column M exact title)
    subject = `📌 تحديث حالة طلب الخدمة رقم ${appId} إلى (${rawStatus}) - الدفاع المدني | Status Update (${appId})`;
    badgeColor = 'rgba(56, 189, 248, 0.12)';
    badgeBorder = '#38BDF8';
    headerTitle = `📌 تحديث حالة الطلب إلى: ${rawStatus}`;
    contentHtml = `
      <p style="font-size: 1rem; line-height: 1.7; color: #E2E8F0;">
        تم تحديث حالة طلبكم رقم (<strong style="color: #38BDF8;">${appId}</strong>) لخدمة (<strong style="color: #FFFFFF;">${serviceName}</strong>) في النظام إلى: <strong style="color: #38BDF8; font-size: 1.05rem;">${rawStatus}</strong>.
      </p>
      ${reason ? `
      <div style="background: rgba(30, 41, 59, 0.9); border-right: 4px solid #38BDF8; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <div style="font-weight: bold; color: #38BDF8; font-size: 1rem; margin-bottom: 6px;">
          ملاحظات الإدارة:
        </div>
        <div style="color: #FFFFFF; font-size: 0.95rem; line-height: 1.6;">
          ${reason}
        </div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 26px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #0284C7; color: #FFFFFF; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 1rem; display: inline-block;">
          🔍 متابعة حالة الطلب
        </a>
      </div>
    `;
  }

  const htmlBody = `
    <div dir="rtl" style="font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; text-align: right; background-color: #0F172A; color: #F8FAFC; padding: 32px 24px; border-radius: 14px; max-width: 620px; margin: 0 auto; border: 1.5px solid ${badgeBorder}; box-shadow: 0 12px 35px rgba(0,0,0,0.55);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 18px; margin-bottom: 22px;">
        <h2 style="color: #F59E0B; margin: 0 0 6px 0; font-size: 1.4rem;">الإدارة العامة للدفاع المدني - مملكة البحرين</h2>
        <p style="color: #94A3B8; margin: 0; font-size: 0.85rem; letter-spacing: 0.5px;">GENERAL DIRECTORATE OF CIVIL DEFENSE</p>
      </div>

      <div style="background: ${badgeColor}; border: 1.5px solid ${badgeBorder}; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px; text-align: center;">
        <h3 style="color: ${badgeBorder}; margin: 0; font-size: 1.25rem; font-weight: 800;">${headerTitle}</h3>
      </div>

      <p style="font-size: 1.1rem; font-weight: bold; color: #FFFFFF; margin-bottom: 12px;">
        عزيزنا المتعامل: ${clientName}،
      </p>

      ${contentHtml}

      ${mainActionBtn}

      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 0.88rem;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #94A3B8; padding: 6px 0; width: 130px; font-weight: bold;">رقم الطلب:</td>
            <td style="color: #38BDF8; font-weight: bold; font-family: monospace;">${appId}</td>
          </tr>
          <tr>
            <td style="color: #94A3B8; padding: 6px 0; font-weight: bold;">نوع الخدمة:</td>
            <td style="color: #FFFFFF; font-weight: bold;">${serviceName}</td>
          </tr>
          <tr>
            <td style="color: #94A3B8; padding: 6px 0; font-weight: bold;">رابط المتابعة والتعديل:</td>
            <td style="color: #38BDF8; word-break: break-all;"><a href="${trackingLink}" style="color: #38BDF8;">${trackingLink}</a></td>
          </tr>
        </table>
      </div>

      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0 16px 0;" />
      <div style="text-align: center; font-size: 0.8rem; color: #64748B; line-height: 1.6;">
        <p style="margin: 0 0 4px 0; color: #94A3B8;">مركز خدمات الدفاع المدني الموحد: 17461100 • الطوارئ: 999</p>
        <p style="margin: 0;">تم إرسال هذا الإشعار تلقائياً إلى بريدكم المسجل (<a href="mailto:${userEmail}" style="color: #94A3B8;">${userEmail}</a>).</p>
      </div>
    </div>
  `;

  const transporter = createEmailTransporter();

  if (!transporter) {
    console.log(`[User Email Engine] ℹ️ Outbound SMTP not active. User status notification prepared for <${userEmail}> [Status: ${status}].`);
    return {
      status: 'simulated_or_unconfigured',
      recipient: userEmail,
      appStatus: status,
      subject,
      reason: 'SMTP credentials not configured in environment.'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Bahrain Civil Defense" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject,
      html: htmlBody
    });

    console.log(`[User Email Engine] ✉️ Direct User Status Notification Email (${status}) successfully delivered to <${userEmail}> (MessageId: ${info.messageId}) ✅`);
    return { status: 'sent', messageId: info.messageId, recipient: userEmail, appStatus: status, subject };
  } catch (err) {
    console.error(`[User Email Engine] ❌ SMTP User Email Delivery failed for <${userEmail}> [Status: ${status}]:`, err.message);
    return { status: 'failed', error: err.message, recipient: userEmail, appStatus: status };
  }
}

/**
 * Dispatches an official Voice/Text AI Chat Transcript Email to the user when requested.
 */
async function sendUserTranscriptEmail({ clientName, userEmail, phoneNumber, transcriptText, transcriptHtml }) {
  const recipient = userEmail || process.env.ADMIN_EMAIL || 'gdcdvirtual@gmail.com';
  const name = clientName || 'عزيزنا المتعامل';
  const phone = phoneNumber || 'غير مسجل';
  const timestamp = new Date().toLocaleString('ar-BH', { timeZone: 'Asia/Bahrain' });

  const subject = `📋 توثيق وسجل محادثتك مع المساعد الذكي - الإدارة العامة للدفاع المدني`;

  const bodyHtml = `
    <div dir="rtl" style="font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; text-align: right; background-color: #0A0F1D; color: #F8FAFC; padding: 32px 24px; border-radius: 14px; max-width: 620px; margin: 0 auto; border: 1.5px solid #D4AF37; box-shadow: 0 12px 35px rgba(0,0,0,0.55);">
      <div style="text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 18px; margin-bottom: 22px;">
        <div style="margin-bottom: 14px; text-align: center;">
          <img src="cid:civil_defense_logo" alt="شعار الإدارة العامة للدفاع المدني" width="90" style="display: block; margin: 0 auto 10px auto;" />
        </div>
        <h1 style="color: #FFFFFF; margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">مملكة البحرين - وزارة الداخلية</h1>
        <h2 style="color: #D4AF37; margin: 0 0 12px 0; font-size: 17px; font-weight: 600;">الإدارة العامة للدفاع المدني</h2>
        <div style="display: inline-block; background: rgba(212, 175, 55, 0.12); border: 1px solid #D4AF37; border-radius: 30px; padding: 6px 20px;">
          <span style="color: #F6E05E; font-size: 13px; font-weight: 700;">📋 توثيق المحادثة وسجل الاستفسارات الرسمية</span>
        </div>
      </div>

      <p style="font-size: 16px; color: #FFFFFF; font-weight: 700; margin-bottom: 12px;">مرحباً بك <span style="color: #F6E05E;">${name}</span>،</p>
      <p style="font-size: 14px; color: #CBD5E1; line-height: 1.6; margin-bottom: 20px;">نشكر تواصلك مع مركز خدمات الإدارة العامة للدفاع المدني بمملكة البحرين. بناءً على طلبك، نرفق لك التوثيق الكامل لسجل الحوار مع المساعد الذكي:</p>
      
      <div style="background: rgba(10, 16, 32, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #94A3B8; padding: 4px 0; width: 130px;">👤 اسم المتعامل:</td>
            <td style="color: #FFFFFF; font-weight: bold;">${name}</td>
          </tr>
          <tr>
            <td style="color: #94A3B8; padding: 4px 0;">📞 رقم الهاتف:</td>
            <td style="color: #FFFFFF; font-weight: bold;">${phone}</td>
          </tr>
          <tr>
            <td style="color: #94A3B8; padding: 4px 0;">📅 التاريخ والتوقيت:</td>
            <td style="color: #E2E8F0;">${timestamp}</td>
          </tr>
        </table>
      </div>

      ${transcriptHtml || `<div style="background: #080D1A; border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 14px; padding: 20px; margin-bottom: 24px; font-size: 13.5px; line-height: 1.7; color: #F1F5F9; white-space: pre-wrap;">${transcriptText || 'تم توثيق بياناتك وتفاصيل محادثتك مع المساعد الذكي بنجاح.'}</div>`}

      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0 16px 0;" />
      <div style="text-align: center; font-size: 0.8rem; color: #64748B; line-height: 1.6;">
        <p style="margin: 0 0 4px 0; color: #94A3B8;">مركز خدمات الدفاع المدني الموحد: 17461100 • الطوارئ: 999</p>
        <p style="margin: 0;">© 2026 الإدارة العامة للدفاع المدني - وزارة الداخلية - مملكة البحرين. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  `;

  const plainTextSummary = `مملكة البحرين - وزارة الداخلية\nالإدارة العامة للدفاع المدني\n\nتأكيد وتوثيق المحادثة لـ: ${name}\nرقم الهاتف: ${phone}\nالتاريخ والتوقيت: ${timestamp}\n\nشكراً لتواصلك مع مركز خدمات الدفاع المدني. بناءً على طلبك، تم إرفاق توثيق المحادثة.\n\nمركز الخدمات الموحد: 17461100 • الطوارئ: 999`;

  const transporter = createEmailTransporter();

  if (!transporter) {
    console.log(`[Transcript Email Engine] ℹ️ Outbound SMTP not configured. Transcript notification prepared for <${recipient}>.`);
    return { status: 'simulated_or_unconfigured', recipient };
  }

  try {
    const path = require('path');
    const info = await transporter.sendMail({
      from: `"Bahrain Civil Defense" <${process.env.SMTP_USER}>`,
      to: recipient,
      replyTo: process.env.SMTP_USER || 'gdcdvirtual@gmail.com',
      subject,
      text: plainTextSummary,
      html: bodyHtml,
      attachments: [
        {
          filename: 'civil_defense_official_logo.png',
          path: path.join(__dirname, '..', 'icons', 'civil_defense_official_logo.png'),
          cid: 'civil_defense_logo'
        }
      ],
      headers: {
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'X-Report-Abuse-To': process.env.SMTP_USER || 'gdcdvirtual@gmail.com'
      }
    });

    console.log(`[Transcript Email Engine] ✉️ Direct Transcript Email successfully delivered to <${recipient}> (MessageId: ${info.messageId}) ✅`);
    return { status: 'sent', messageId: info.messageId, recipient, subject };
  } catch (err) {
    console.error(`[Transcript Email Engine] ❌ SMTP Transcript Email delivery failed for <${recipient}>:`, err.message);
    return { status: 'failed', error: err.message, recipient };
  }
}

module.exports = { 
  sendAdminApplicationNotification, 
  sendUserApplicationStatusEmail,
  sendUserTranscriptEmail,
  createEmailTransporter 
};
