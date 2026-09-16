// scripts/admin_email_notifier.js - Bahrain Civil Defense Multi-Status Admin Email Engine
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {}

function createEmailTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = 587;
  const secure = false;

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.SMTP_ALLOW_INSECURE_TLS === 'true' ? false : true
    }
  });
}

async function sendBrevoEmail({ to, subject, htmlContent, senderName, senderEmail, attachments }) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = senderEmail || process.env.SENDER_EMAIL || "support@bhcdai.com";
  const replyEmail = process.env.REPLY_EMAIL || "support@bhcdai.com";
  const fromName = senderName || "Bahrain Civil Defense Support";

  try {
    const payload = {
      sender: { name: fromName, email: fromEmail },
      to: Array.isArray(to) ? to.map(e => (typeof e === 'string' ? { email: e } : e)) : [{ email: to }],
      replyTo: { name: "Bahrain Civil Defense Support", email: replyEmail },
      subject: subject,
      htmlContent: htmlContent
    };

    if (attachments && attachments.length > 0) {
      payload.attachment = attachments.map(att => {
        if (att.content && att.filename) {
          return { content: att.content, name: att.filename };
        } else if (att.path && att.filename) {
          try {
            const fileData = fs.readFileSync(att.path);
            return { content: fileData.toString('base64'), name: att.filename };
          } catch (e) {
            return null;
          }
        }
        return null;
      }).filter(Boolean);
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resJson = await response.json();
    if (response.ok) {
      return { status: 'sent', messageId: resJson.messageId, recipient: to, subject };
    } else {
      console.error("[Brevo API Error]", resJson);
      return { status: 'failed', error: resJson.message || JSON.stringify(resJson), recipient: to };
    }
  } catch (err) {
    console.error("[Brevo API Exception]", err.message);
    return { status: 'failed', error: err.message, recipient: to };
  }
}

function cleanUrl(inputUrl, appId, pathType = 'track') {
  const domain = 'bhcdai.com';
  if (pathType === 'receipt') return `https://${domain}/receipt?id=${appId || ''}`;
  if (pathType === 'quick-action') return `https://${domain}/admin/quick-action?id=${appId || ''}&key=${process.env.ADMIN_SECRET_KEY || 'cd_admin_secure_pass_2026'}`;
  return `https://${domain}/track?id=${appId || ''}`;
}

/**
 * Dispatches an official Admin Alert Email for any Application Lifecycle Status.
 */
async function sendAdminApplicationNotification(appData) {
  const envBase = (process.env.APP_URL || process.env.BASE_URL || process.env.PUBLIC_URL || 'https://bhcdai.com').trim().replace(/\/+$/, '');
  const baseUrl = (!envBase.includes('localhost') && !envBase.includes('127.0.0.1')) ? envBase : 'https://bhcdai.com';
  const adminEmail = appData.adminEmail || process.env.ADMIN_EMAIL || 'support@bhcdai.com';
  const appId = appData.appId || 'APP-UNKNOWN';
  const serviceName = appData.serviceName || 'خدمة الدفاع المدني';
  const clientName = `${appData.firstName || ''} ${appData.lastName || ''}`.trim() || appData.clientName || 'عزيزنا المتعامل';
  const phone = appData.whatsapp || appData.phone || 'غير متوفر';
  const applicantEmail = appData.email || 'غير متوفر';
  const trackingLink = `${baseUrl}/track?id=${appId}`;
  const attachmentLink = appData.attachmentLink || '';
  const certificateLink = `${baseUrl}/receipt?id=${appId}`;
  const quickActionLink = `${baseUrl}/admin/quick-action?id=${appId}&key=${process.env.ADMIN_SECRET_KEY || 'cd_admin_secure_pass_2026'}`;
  
  // Status normalization
  let status = appData.status || (appData.isNewApplication ? 'Submitted' : 'Modification Resubmitted');
  if (status === 'Pending' && appData.isNewApplication) status = 'Submitted';

  let subject = '';
  let headerTitle = '';
  let badgeSubtitle = '';
  let highlightSection = '';

  switch (status) {
    case 'Submitted':
    case 'New Application':
      subject = `طلب خدمة جديد: ${appId} - ${clientName}`;
      headerTitle = 'استلام طلب خدمة جديد';
      badgeSubtitle = 'تم تسجيل معاملة جديدة في النظام وتحتاج إلى تدقيق ومراجعة ضابط الدفاع المدني المختص.';
      break;

    case 'Modification Resubmitted':
    case 'User Updated':
      subject = `تحديث مستندات وبيانات معاملة: ${appId} - ${clientName}`;
      headerTitle = 'تحديث مستندات من المتعامل';
      badgeSubtitle = 'قام المتعامل بإعادة رفع المخططات وتحديث بيانات المعاملة بناءً على الملاحظات السابقة.';
      if (appData.modificationDetails || appData.userModificationResponse || appData.notes) {
        highlightSection = `
          <div style="background: #1e293b; border-right: 3px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
            <div style="font-weight: 600; color: #93c5fd; font-size: 0.88rem; margin-bottom: 4px;">ملاحظات ورد المتعامل:</div>
            <p style="margin: 0; color: #e2e8f0; font-size: 0.9rem; line-height: 1.5;">${appData.modificationDetails || appData.userModificationResponse || appData.notes}</p>
          </div>
        `;
      }
      break;

    case 'Modification Requested':
      subject = `إشعار بطلب تعديل مستندات: ${appId} - ${clientName}`;
      headerTitle = 'طلب استكمال / تعديل مستندات';
      badgeSubtitle = 'تم إخطار المتعامل بضرورة تعديل المخططات أو استكمال البيانات المطلوبة.';
      if (appData.reason || appData.modificationDetails) {
        highlightSection = `
          <div style="background: #1e293b; border-right: 3px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
            <div style="font-weight: 600; color: #fcd34d; font-size: 0.88rem; margin-bottom: 4px;">الملاحظات والتعليمات المرسلة للمتعامل:</div>
            <p style="margin: 0; color: #e2e8f0; font-size: 0.9rem; line-height: 1.5;">${appData.reason || appData.modificationDetails}</p>
          </div>
        `;
      }
      break;

    case 'Approved':
      subject = `تم اعتماد المعاملة وإصدار الشهادة: ${appId} - ${clientName}`;
      headerTitle = 'تم اعتماد المعاملة بنجاح';
      badgeSubtitle = 'تم استيفاء كافة الاشتراطات واعتماد المعاملة وإصدار شهادة الترخيص الرسمية برمز الاستجابة (QR).';
      highlightSection = `
        <div style="margin: 18px 0; text-align: center;">
          <a href="${certificateLink}" target="_blank" style="background: #059669; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
            معاينة شهادة الاعتماد الرسمية (PDF)
          </a>
        </div>
      `;
      break;

    case 'Rejected':
      subject = `إشعار برفض المعاملة: ${appId} - ${clientName}`;
      headerTitle = 'تم رفض المعاملة';
      badgeSubtitle = 'تم تسجيل قرار عدم الموافقة على الطلب وإشعار المتعامل رسمياً بالأسباب.';
      if (appData.reason || appData.modificationDetails) {
        highlightSection = `
          <div style="background: #1e293b; border-right: 3px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
            <div style="font-weight: 600; color: #fca5a5; font-size: 0.88rem; margin-bottom: 4px;">أسباب عدم الموافقة المسجلة:</div>
            <p style="margin: 0; color: #e2e8f0; font-size: 0.9rem; line-height: 1.5;">${appData.reason || appData.modificationDetails}</p>
          </div>
        `;
      }
      break;

    default:
      subject = `تحديث حالة المعاملة: ${appId} (${status})`;
      headerTitle = `تحديث حالة المعاملة إلى (${status})`;
      badgeSubtitle = 'تم تحديث حالة المعاملة في قاعدة بيانات منصة الدفاع المدني.';
      break;
  }

  const htmlBody = `
    <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: right; background-color: #0f172a; color: #f8fafc; padding: 32px 24px; border-radius: 12px; max-width: 580px; margin: 0 auto; border: 1px solid #334155; box-shadow: 0 4px 20px rgba(0,0,0,0.35);">
      
      <!-- Institutional Header -->
      <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 18px; margin-bottom: 22px;">
        <div style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">مملكة البحرين - وزارة الداخلية</div>
        <div style="font-size: 1.25rem; color: #ffffff; font-weight: 700; margin: 0 0 4px 0;">الإدارة العامة للدفاع المدني</div>
        <div style="font-size: 0.72rem; color: #64748b; letter-spacing: 1px;">GENERAL DIRECTORATE OF CIVIL DEFENSE</div>
      </div>

      <!-- Action Banner -->
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px;">
        <div style="font-size: 1.05rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">${headerTitle}</div>
        <div style="font-size: 0.88rem; color: #94a3b8; line-height: 1.5;">${badgeSubtitle}</div>
      </div>

      <!-- Application Details Table -->
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0; color: #94a3b8; width: 130px; font-weight: 600;">رقم المعاملة:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #38bdf8; font-family: monospace; font-size: 1rem;">${appId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">نوع الخدمة:</td>
            <td style="padding: 10px 0; color: #ffffff; font-weight: 600;">${serviceName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">مقدم الطلب:</td>
            <td style="padding: 10px 0; color: #f8fafc;">${clientName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">الحالة الحالية:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #f8fafc;">${status}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">رقم الهاتف:</td>
            <td style="padding: 10px 0; color: #f8fafc; direction: ltr; text-align: right;">
              <a href="tel:+${phone.replace(/[^0-9]/g, '')}" style="color: #38bdf8; text-decoration: none;">+${phone.replace(/[^0-9]/g, '')}</a>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">البريد الإلكتروني:</td>
            <td style="padding: 10px 0; color: #f8fafc; direction: ltr; text-align: right;">
              <a href="mailto:${applicantEmail}" style="color: #38bdf8; text-decoration: none;">${applicantEmail}</a>
            </td>
          </tr>
          ${appData.paymentMethod ? `
          <tr>
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">طريقة الدفع:</td>
            <td style="padding: 10px 0; color: #f8fafc;">${appData.paymentMethod}</td>
          </tr>` : ''}
        </table>
      </div>

      ${highlightSection}

      ${attachmentLink ? `
      <div style="margin: 16px 0; text-align: center;">
        <a href="${attachmentLink}" target="_blank" style="background: #334155; color: #f8fafc; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.88rem; display: inline-block;">
          معاينة المخططات والمستند المرفق (PDF)
        </a>
      </div>` : ''}

      <div style="margin: 24px 0 12px 0; text-align: center;">
        <a href="${quickActionLink}" style="background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.95rem; display: inline-block;">
          فتح بوابة الإجراء السريع والاعتماد
        </a>
      </div>

      <div style="text-align: center; margin-top: 12px;">
        <a href="${trackingLink}" style="color: #94a3b8; font-size: 0.82rem; text-decoration: underline;">
          رابط بوابة تتبع المتعامل المباشرة
        </a>
      </div>

      <!-- Institutional Footer -->
      <div style="border-top: 1px solid #334155; padding-top: 18px; margin-top: 24px; text-align: center; font-size: 0.78rem; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 4px 0; color: #94a3b8; font-weight: 600;">مركز خدمات الدفاع المدني: 17461100 • الطوارئ: 999</p>
        <p style="margin: 0;">هذا إشعار داخلي رسمي صادر للمسؤول المعتمد (${adminEmail}).</p>
      </div>
    </div>
  `;

  // Primary Brevo API Dispatch
  try {
    const brevoRes = await sendBrevoEmail({
      to: adminEmail,
      subject,
      htmlContent: htmlBody,
      senderName: "Bahrain Civil Defense Support",
      senderEmail: process.env.SENDER_EMAIL || "support@bhcdai.com"
    });
    if (brevoRes.status === 'sent') {
      console.log(`[Admin Email Engine] ✉️ Direct Admin Notification Email delivered via Brevo API to ${adminEmail} for status (${status}) (MessageId: ${brevoRes.messageId}) ✅`);
      return { status: 'sent', messageId: brevoRes.messageId, recipient: adminEmail, appStatus: status, subject };
    }
  } catch (brevoErr) {
    console.warn(`[Admin Email Engine] Brevo API fallback to SMTP:`, brevoErr.message);
  }

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
      from: `"Bahrain Civil Defense Support" <${process.env.SENDER_EMAIL || process.env.SMTP_USER || 'support@bhcdai.com'}>`,
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
 * status changes.
 */
async function sendUserApplicationStatusEmail(appData) {
  const envBase = (process.env.APP_URL || process.env.BASE_URL || process.env.PUBLIC_URL || 'https://bhcdai.com').trim().replace(/\/+$/, '');
  const baseUrl = (!envBase.includes('localhost') && !envBase.includes('127.0.0.1')) ? envBase : 'https://bhcdai.com';
  const userEmail = (appData.email || appData.userEmail || '').trim();
  const appId = appData.appId || 'APP-UNKNOWN';
  const serviceName = appData.serviceName || 'خدمة الدفاع المدني';
  const clientName = `${appData.firstName || ''} ${appData.lastName || ''}`.trim() || appData.clientName || 'عزيزنا المتعامل';
  const trackingLink = `${baseUrl}/track?id=${appId}`;
  const certificateLink = `${baseUrl}/receipt?id=${appId}`;
  const status = appData.status || 'Modification Requested';
  const reason = appData.reason || appData.modificationDetails || '';

  const isInvalidEmail = !userEmail || 
    !userEmail.includes('@') ||
    userEmail.endsWith('@example.com') || 
    userEmail.endsWith('@test.com') || 
    userEmail.toLowerCase() === 'dummy@dummy.com';

  if (isInvalidEmail) {
    console.log(`[User Email Engine] 🛑 Invalid or dummy email address detected (<${userEmail}>). Skipping live email dispatch.`);
    return { status: 'skipped_invalid_email', recipient: userEmail, appId };
  }

  let subject = '';
  let headerTitle = '';
  let badgeSubtitle = '';
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
    subject = `مطلوب استكمال وتعديل مستندات المعاملة رقم ${appId} - الدفاع المدني`;
    headerTitle = 'مطلوب تعديل واستكمال المستندات';
    badgeSubtitle = 'يرجى مراجعة الملاحظات الفنية أدناه وإعادة رفع المخططات المطلوبة لاستكمال المعاملة.';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        تود الإدارة العامة للدفاع المدني إفادتكم بضرورة تعديل المستندات أو استكمال البيانات الخاصة بطلبكم لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>).
      </p>
      <div style="background: #1e293b; border-right: 3px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <div style="font-weight: 600; color: #fcd34d; font-size: 0.88rem; margin-bottom: 4px;">
          ملاحظات وتوجيهات الإدارة:
        </div>
        <div style="color: #ffffff; font-size: 0.9rem; line-height: 1.6;">
          ${reason || 'يرجى الدخول إلى صفحة المتابعة للاطلاع على النواقص والتعديلات المطلوبة.'}
        </div>
      </div>
      <p style="font-size: 0.88rem; color: #94a3b8; line-height: 1.6;">
        يمكنكم تحديث المخططات والمستندات مباشرة عبر الرابط أدناه دون الحاجة لتقديم طلب جديد:
      </p>
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          تعديل وإعادة رفع المستندات الآن
        </a>
      </div>
    `;
  } else if (isUnderReview) {
    subject = `تحديث حالة المعاملة رقم ${appId}: قيد المراجعة والتدقيق الفني - الدفاع المدني`;
    headerTitle = 'المعاملة قيد المراجعة والتدقيق الفني';
    badgeSubtitle = 'يجري حالياً دراسة المخططات والبيانات المرفقة من قبل المهندسين والمختصين.';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        نفيدكم بأن معاملتكم رقم (<strong style="color: #38bdf8; font-family: monospace;">${appId}</strong>) لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>) قيد التدقيق الهندسي والفني للتحقق من استيفاء اشتراطات السلامة والوقاية من الحريق.
      </p>
      ${reason ? `
      <div style="background: #1e293b; border-right: 3px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <div style="font-weight: 600; color: #93c5fd; font-size: 0.88rem; margin-bottom: 4px;">ملاحظات التدقيق الفني:</div>
        <div style="color: #ffffff; font-size: 0.9rem; line-height: 1.6;">${reason}</div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          متابعة وتتبع حالة المعاملة
        </a>
      </div>
    `;
  } else if (isInProgress) {
    subject = `تحديث حالة المعاملة رقم ${appId}: قيد المعالجة والإجراء - الدفاع المدني`;
    headerTitle = 'المعاملة قيد المعالجة واستكمال الإجراءات';
    badgeSubtitle = 'يجري استكمال الإجراءات الإدارية والفنية الخاصة بمعاملتكم لدى الوحدات المختصة.';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        نفيدكم بأن معاملتكم رقم (<strong style="color: #38bdf8; font-family: monospace;">${appId}</strong>) لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>) قيد المعالجة والإجراء الداخلي.
      </p>
      ${reason ? `
      <div style="background: #1e293b; border-right: 3px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <div style="font-weight: 600; color: #93c5fd; font-size: 0.88rem; margin-bottom: 4px;">ملاحظات المعاملة:</div>
        <div style="color: #ffffff; font-size: 0.9rem; line-height: 1.6;">${reason}</div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          متابعة حالة المعاملة
        </a>
      </div>
    `;
  } else if (isInspection) {
    subject = `تحديث حالة المعاملة رقم ${appId}: قيد المعاينة الميدانية - الدفاع المدني`;
    headerTitle = 'جاري التنسيق للمعاينة والفحص الميداني';
    badgeSubtitle = 'سيقوم مفتش الدفاع المدني بالتنسيق معكم للتحقق الميداني من جاهزية اشتراطات السلامة.';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        تم تحويل معاملتكم رقم (<strong style="color: #38bdf8; font-family: monospace;">${appId}</strong>) لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>) إلى مرحلة المعاينة الميدانية للموقع.
      </p>
      ${reason ? `
      <div style="background: #1e293b; border-right: 3px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <div style="font-weight: 600; color: #93c5fd; font-size: 0.88rem; margin-bottom: 4px;">تعليمات المعاينة:</div>
        <div style="color: #ffffff; font-size: 0.9rem; line-height: 1.6;">${reason}</div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          تتبع تفاصيل المعاينة
        </a>
      </div>
    `;
  } else if (isModResubmitted) {
    subject = `تأكيد استلام تعديلات المعاملة رقم ${appId} - الدفاع المدني`;
    headerTitle = 'تم استلام المستندات المحدثة بنجاح';
    badgeSubtitle = 'تم استلام مرفقاتكم وبياناتكم المحدثة ويجري تدقيقها من قبل الضابط المختص.';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        تم بنجاح استلام المستندات والبيانات المحدثة لمعاملتكم رقم (<strong style="color: #38bdf8; font-family: monospace;">${appId}</strong>) لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>).
      </p>
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          متابعة حالة المعاملة
        </a>
      </div>
    `;
  } else if (isApproved) {
    subject = `تم اعتماد المعاملة وإصدار الشهادة رقم ${appId} - الدفاع المدني`;
    headerTitle = 'تم اعتماد المعاملة وإصدار الشهادة الرسمية';
    badgeSubtitle = 'يسرنا إفادتكم باعتماد المعاملة بنجاح وتوليد شهادة الاستيفاء والترخيص الإلكتروني المزودة برمز الاستجابة السريعة (QR).';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        تم بحمد الله تدقيق واعتماد معاملتكم رقم (<strong style="color: #38bdf8; font-family: monospace;">${appId}</strong>) لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>) وفقاً للاشتراطات الفنية المعتمدة.
      </p>
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${certificateLink}" target="_blank" style="background: #059669; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          تحميل وطباعة شهادة الاعتماد (PDF)
        </a>
      </div>
    `;
  } else if (isRejected) {
    subject = `إشعار بخصوص المعاملة رقم ${appId} - الدفاع المدني`;
    headerTitle = 'إشعار بعدم الموافقة على الطلب';
    badgeSubtitle = 'نأسف لإبلاغكم بأنه تعذر قبول المعاملة نظراً لعدم استيفاء الاشتراطات المطلوبة.';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        نفيدكم بعدم الموافقة على معاملتكم رقم (<strong style="color: #38bdf8; font-family: monospace;">${appId}</strong>) لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>).
      </p>
      ${reason ? `
      <div style="background: #1e293b; border-right: 3px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <div style="font-weight: 600; color: #fca5a5; font-size: 0.88rem; margin-bottom: 4px;">أسباب القرار:</div>
        <div style="color: #ffffff; font-size: 0.9rem; line-height: 1.6;">${reason}</div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #334155; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          عرض تفاصيل المعاملة
        </a>
      </div>
    `;
  } else if (normalizedStatus === 'submitted' || normalizedStatus === 'pending' || normalizedStatus === 'جديد' || normalizedStatus === 'تم الاستلام' || !rawStatus) {
    subject = `تأكيد استلام طلب الخدمة رقم ${appId} - الدفاع المدني`;
    headerTitle = 'تم استلام طلب الخدمة بنجاح';
    badgeSubtitle = 'تم تسجيل طلبكم رسمياً في النظام وسيتم تدقيقه من قبل المختصين بالدفاع المدني.';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        يسر الإدارة العامة للدفاع المدني إفادتكم باستلام طلبكم لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>) برقم المعاملة (<strong style="color: #38bdf8; font-family: monospace;">${appId}</strong>).
      </p>
      <p style="font-size: 0.88rem; color: #94a3b8; line-height: 1.6;">
        سيتم إشعاركم عبر البريد الإلكتروني فور تحديث حالة المعاملة، وبإمكانكم المتابعة المباشرة في أي وقت.
      </p>
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          متابعة حالة الطلب
        </a>
      </div>
    `;
  } else {
    subject = `تحديث حالة المعاملة رقم ${appId}: (${rawStatus}) - الدفاع المدني`;
    headerTitle = `تحديث حالة المعاملة إلى: ${rawStatus}`;
    badgeSubtitle = 'تم تحديث حالة المعاملة في النظام.';
    contentHtml = `
      <p style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; margin-bottom: 16px;">
        تم تحديث حالة معاملتكم رقم (<strong style="color: #38bdf8; font-family: monospace;">${appId}</strong>) لخدمة (<strong style="color: #ffffff;">${serviceName}</strong>) إلى: <strong style="color: #ffffff;">${rawStatus}</strong>.
      </p>
      ${reason ? `
      <div style="background: #1e293b; border-right: 3px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <div style="font-weight: 600; color: #93c5fd; font-size: 0.88rem; margin-bottom: 4px;">ملاحظات الإدارة:</div>
        <div style="color: #ffffff; font-size: 0.9rem; line-height: 1.6;">${reason}</div>
      </div>` : ''}
    `;
    mainActionBtn = `
      <div style="margin: 22px 0 16px 0; text-align: center;">
        <a href="${trackingLink}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.92rem; display: inline-block;">
          متابعة حالة الطلب
        </a>
      </div>
    `;
  }

  const htmlBody = `
    <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: right; background-color: #0f172a; color: #f8fafc; padding: 32px 24px; border-radius: 12px; max-width: 580px; margin: 0 auto; border: 1px solid #334155; box-shadow: 0 4px 20px rgba(0,0,0,0.35);">
      
      <!-- Institutional Header -->
      <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 18px; margin-bottom: 22px;">
        <div style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">مملكة البحرين - وزارة الداخلية</div>
        <div style="font-size: 1.25rem; color: #ffffff; font-weight: 700; margin: 0 0 4px 0;">الإدارة العامة للدفاع المدني</div>
        <div style="font-size: 0.72rem; color: #64748b; letter-spacing: 1px;">GENERAL DIRECTORATE OF CIVIL DEFENSE</div>
      </div>

      <!-- Status Notice -->
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px;">
        <div style="font-size: 1.05rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">${headerTitle}</div>
        <div style="font-size: 0.88rem; color: #94a3b8; line-height: 1.5;">${badgeSubtitle}</div>
      </div>

      <p style="font-size: 0.95rem; font-weight: 600; color: #ffffff; margin-bottom: 12px;">
        عزيزنا المتعامل: ${clientName}،
      </p>

      ${contentHtml}

      ${mainActionBtn}

      <!-- Metadata Box -->
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 0.88rem;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="color: #94a3b8; padding: 8px 0; width: 130px; font-weight: 600;">رقم المعاملة:</td>
            <td style="color: #38bdf8; font-weight: 700; font-family: monospace;">${appId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="color: #94a3b8; padding: 8px 0; font-weight: 600;">نوع الخدمة:</td>
            <td style="color: #ffffff; font-weight: 600;">${serviceName}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 8px 0; font-weight: 600;">رابط المتابعة المباشر:</td>
            <td style="color: #38bdf8; word-break: break-all;"><a href="${trackingLink}" style="color: #38bdf8; text-decoration: none;">${trackingLink}</a></td>
          </tr>
        </table>
      </div>

      <!-- Institutional Footer -->
      <div style="border-top: 1px solid #334155; padding-top: 18px; margin-top: 24px; text-align: center; font-size: 0.78rem; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 4px 0; color: #94a3b8; font-weight: 600;">مركز خدمات الدفاع المدني: 17461100 • الطوارئ: 999</p>
        <p style="margin: 0;">تم إرسال هذا الإشعار تلقائياً إلى بريدكم المسجل (${userEmail}).</p>
      </div>
    </div>
  `;

  // Primary Brevo API Dispatch
  try {
    const brevoRes = await sendBrevoEmail({
      to: userEmail,
      subject,
      htmlContent: htmlBody,
      senderName: "Bahrain Civil Defense Support",
      senderEmail: process.env.SENDER_EMAIL || "support@bhcdai.com"
    });
    if (brevoRes.status === 'sent') {
      console.log(`[User Email Engine] ✉️ Direct User Status Notification Email (${status}) delivered via Brevo API to <${userEmail}> (MessageId: ${brevoRes.messageId}) ✅`);
      return { status: 'sent', messageId: brevoRes.messageId, recipient: userEmail, appStatus: status, subject };
    }
  } catch (brevoErr) {
    console.warn(`[User Email Engine] Brevo API fallback to SMTP:`, brevoErr.message);
  }

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
      from: `"Bahrain Civil Defense Support" <${process.env.SENDER_EMAIL || process.env.SMTP_USER || 'support@bhcdai.com'}>`,
      replyTo: process.env.SENDER_EMAIL || process.env.SMTP_USER || 'support@bhcdai.com',
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
async function sendUserTranscriptEmail({ clientName, userEmail, email, phoneNumber, transcriptText, transcriptHtml }) {
  const recipient = userEmail || email || process.env.ADMIN_EMAIL || 'support@bhcdai.com';
  const name = clientName || 'عزيزنا المتعامل';
  const phone = phoneNumber || 'غير مسجل';
  const timestamp = new Date().toLocaleString('ar-BH', { timeZone: 'Asia/Bahrain' });

  const subject = `توثيق وسجل المحادثة - الإدارة العامة للدفاع المدني`;

  const bodyHtml = `
    <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: right; background-color: #0f172a; color: #f8fafc; padding: 32px 24px; border-radius: 12px; max-width: 580px; margin: 0 auto; border: 1px solid #334155; box-shadow: 0 4px 20px rgba(0,0,0,0.35);">
      
      <!-- Institutional Header -->
      <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 18px; margin-bottom: 22px;">
        <div style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">مملكة البحرين - وزارة الداخلية</div>
        <div style="font-size: 1.25rem; color: #ffffff; font-weight: 700; margin: 0 0 4px 0;">الإدارة العامة للدفاع المدني</div>
        <div style="font-size: 0.72rem; color: #64748b; letter-spacing: 1px;">GENERAL DIRECTORATE OF CIVIL DEFENSE</div>
      </div>

      <!-- Banner -->
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px;">
        <div style="font-size: 1.05rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">توثيق المحادثة وسجل الاستفسارات</div>
        <div style="font-size: 0.88rem; color: #94a3b8; line-height: 1.5;">سجل الحوار والتفاعل مع المساعد الذكي للإدارة العامة للدفاع المدني.</div>
      </div>

      <p style="font-size: 0.95rem; font-weight: 600; color: #ffffff; margin-bottom: 8px;">مرحباً بك ${name}،</p>
      <p style="font-size: 0.88rem; color: #94a3b8; line-height: 1.6; margin-bottom: 16px;">
        نشكر تواصلك مع مركز خدمات الدفاع المدني بمملكة البحرين. بناءً على طلبك، نرفق لك التوثيق الكامل لسجل المحادثة:
      </p>
      
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.88rem;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #334155;">
            <td style="color: #94a3b8; padding: 6px 0; width: 120px; font-weight: 600;">اسم المتعامل:</td>
            <td style="color: #ffffff; font-weight: 600;">${name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #334155;">
            <td style="color: #94a3b8; padding: 6px 0; font-weight: 600;">رقم الهاتف:</td>
            <td style="color: #ffffff; font-weight: 600;">${phone}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0; font-weight: 600;">التاريخ والتوقيت:</td>
            <td style="color: #e2e8f0;">${timestamp}</td>
          </tr>
        </table>
      </div>

      ${transcriptHtml || `<div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 0.88rem; line-height: 1.7; color: #f1f5f9; white-space: pre-wrap;">${transcriptText || 'تم توثيق تفاصيل محادثتك مع المساعد الذكي بنجاح.'}</div>`}

      <!-- Institutional Footer -->
      <div style="border-top: 1px solid #334155; padding-top: 18px; margin-top: 24px; text-align: center; font-size: 0.78rem; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 4px 0; color: #94a3b8; font-weight: 600;">مركز خدمات الدفاع المدني: 17461100 • الطوارئ: 999</p>
        <p style="margin: 0;">© 2026 الإدارة العامة للدفاع المدني - وزارة الداخلية - مملكة البحرين.</p>
      </div>
    </div>
  `;

  const plainTextSummary = `مملكة البحرين - وزارة الداخلية\nالإدارة العامة للدفاع المدني\n\nتوثيق وسجل المحادثة: ${name}\nرقم الهاتف: ${phone}\nالتاريخ والتوقيت: ${timestamp}\n\nشكراً لتواصلك مع مركز خدمات الدفاع المدني.\n\nمركز الخدمات: 17461100 • الطوارئ: 999`;

  // Primary Brevo API Dispatch
  try {
    const brevoRes = await sendBrevoEmail({
      to: recipient,
      subject,
      htmlContent: bodyHtml,
      senderName: "Bahrain Civil Defense Support",
      senderEmail: process.env.SENDER_EMAIL || "support@bhcdai.com"
    });
    if (brevoRes.status === 'sent') {
      console.log(`[Transcript Email Engine] ✉️ Direct Transcript Email delivered via Brevo API to <${recipient}> (MessageId: ${brevoRes.messageId}) ✅`);
      return { status: 'sent', messageId: brevoRes.messageId, recipient, subject };
    }
  } catch (brevoErr) {
    console.warn(`[Transcript Email Engine] Brevo API fallback to SMTP:`, brevoErr.message);
  }

  const transporter = createEmailTransporter();

  if (!transporter) {
    console.log(`[Transcript Email Engine] ℹ️ Outbound SMTP not configured. Transcript notification prepared for <${recipient}>.`);
    return { status: 'simulated_or_unconfigured', recipient };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Bahrain Civil Defense Support" <${process.env.SENDER_EMAIL || process.env.SMTP_USER || 'support@bhcdai.com'}>`,
      to: recipient,
      replyTo: process.env.SENDER_EMAIL || process.env.SMTP_USER || 'support@bhcdai.com',
      subject,
      text: plainTextSummary,
      html: bodyHtml
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
