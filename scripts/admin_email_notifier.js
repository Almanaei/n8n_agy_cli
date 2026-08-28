// scripts/admin_email_notifier.js - Bahrain Civil Defense Multi-Status Admin Email Engine
const nodemailer = require('nodemailer');

function createEmailTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
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
  const adminEmail = process.env.ADMIN_EMAIL || 'mnaaaei@gmail.com';
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

module.exports = { sendAdminApplicationNotification, createEmailTransporter };
