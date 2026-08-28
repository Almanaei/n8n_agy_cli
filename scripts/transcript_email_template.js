// scripts/transcript_email_template.js - High-End Bahrain Civil Defense Transcript Email Template

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDialogueBubbles(transcriptArray, clientName) {
  if (!Array.isArray(transcriptArray) || transcriptArray.length === 0) {
    return `<div style="text-align: center; color: #94A3B8; font-size: 13px; padding: 16px;">لم يتم تسجيل أي نصوص في هذا الحوار.</div>`;
  }

  const safeClientName = escapeHtml(clientName || 'المتعامل');

  return transcriptArray
    .filter(turn => turn && (turn.message || turn.original_message || turn.text))
    .map(turn => {
      const isUser = turn.role === 'user' || turn.source === 'user' || turn.sender === 'user';
      const rawText = turn.original_message || turn.message || turn.text || '';
      const text = escapeHtml(rawText).replace(/\n/g, '<br/>');

      if (isUser) {
        return `
          <div style="margin-bottom: 14px; text-align: right;">
            <div style="font-size: 11px; font-weight: 700; color: #D4AF37; margin-bottom: 4px; padding-right: 4px;">
              👤 ${safeClientName}
            </div>
            <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 2px 14px 14px 14px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
              ${text}
            </div>
          </div>
        `;
      } else {
        return `
          <div style="margin-bottom: 14px; text-align: right;">
            <div style="font-size: 11px; font-weight: 700; color: #38BDF8; margin-bottom: 4px; padding-right: 4px;">
              🤖 المساعد الذكي للدفاع المدني
            </div>
            <div style="background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 14px 2px 14px 14px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #F1F5F9; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
              ${text}
            </div>
          </div>
        `;
      }
    })
    .join('');
}

function generateTranscriptEmailHtml({ clientName, phoneNumber, timestamp, conversationId, transcript }) {
  const safeClientName = escapeHtml(clientName || 'عزيزنا المتعامل');
  const safePhone = escapeHtml(phoneNumber || 'غير مسجل');
  const safeConvId = escapeHtml(conversationId || 'CONV-ACTIVE');
  
  let formattedDate = timestamp;
  if (!formattedDate) {
    try {
      formattedDate = new Date().toLocaleString('ar-BH', { timeZone: 'Asia/Bahrain' });
    } catch (e) {
      formattedDate = new Date().toISOString();
    }
  }

  const bubblesHtml = formatDialogueBubbles(transcript, safeClientName);

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>نسخة وتوثيق المحادثة - الإدارة العامة للدفاع المدني</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0f1d; font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; -webkit-font-smoothing: antialiased; direction: rtl; text-align: right; color: #f8fafc;">
  
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0f1d; width: 100%; padding: 30px 10px;">
    <tr>
      <td align="center">
        
        <!-- Main Container Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 650px; background-color: #111a2e; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.35); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65); overflow: hidden;">
          
          <!-- Header Banner with Gold Trim & Official Crest -->
          <tr>
            <td style="background: linear-gradient(135deg, #091224 0%, #132244 100%); padding: 34px 24px; text-align: center; border-bottom: 2px solid #D4AF37;">
              
              <!-- Official Emblem Badge -->
              <div style="margin-bottom: 12px;">
                <img src="https://almanaei-civildefense.pages.dev/icons/icon-192x192.png" alt="Civil Defense Crest" width="76" height="76" style="border-radius: 50%; box-shadow: 0 4px 18px rgba(212, 175, 55, 0.45); border: 2px solid #D4AF37; display: inline-block; vertical-align: middle;" />
              </div>
              
              <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.3px;">
                مملكة البحرين - وزارة الداخلية
              </h1>
              <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 600; color: #D4AF37;">
                الإدارة العامة للدفاع المدني
              </h2>
              
              <div style="display: inline-block; background: rgba(212, 175, 55, 0.12); border: 1px solid #D4AF37; border-radius: 30px; padding: 6px 20px; margin-top: 4px;">
                <span style="color: #F6E05E; font-size: 13px; font-weight: 700;">
                  📋 توثيق المحادثة وسجل الاستفسارات الرسمية
                </span>
              </div>
            </td>
          </tr>

          <!-- Welcome & Summary Section -->
          <tr>
            <td style="padding: 28px 24px 16px 24px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; color: #FFFFFF; font-weight: 700;">
                مرحباً بك <span style="color: #F6E05E;">${safeClientName}</span>،
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                نشكر تواصلك مع مركز خدمات الإدارة العامة للدفاع المدني بمملكة البحرين. بناءً على طلبك خلال محادثتك الصوتية مع المساعد الذكي، نرفق لك التوثيق الكامل لسجل الحوار:
              </p>

              <!-- Session Information Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: rgba(10, 16, 32, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); width: 50%;">
                    <div style="font-size: 11px; color: #94A3B8; margin-bottom: 2px;">👤 اسم المتعامل</div>
                    <div style="font-size: 13px; font-weight: 700; color: #FFFFFF;">${safeClientName}</div>
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); width: 50%;">
                    <div style="font-size: 11px; color: #94A3B8; margin-bottom: 2px;">📞 رقم الهاتف الموثق</div>
                    <div style="font-size: 13px; font-weight: 700; color: #FFFFFF; direction: ltr; text-align: right;">${safePhone}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; width: 50%;">
                    <div style="font-size: 11px; color: #94A3B8; margin-bottom: 2px;">📅 تاريخ وتوقيت الجلسة</div>
                    <div style="font-size: 12px; font-weight: 500; color: #E2E8F0;">${formattedDate}</div>
                  </td>
                  <td style="padding: 14px 18px; width: 50%;">
                    <div style="font-size: 11px; color: #94A3B8; margin-bottom: 2px;">🤖 القناة الرسمية</div>
                    <div style="font-size: 12px; font-weight: 700; color: #38BDF8;">المساعد الصوتي الذكي (Voice AI)</div>
                  </td>
                </tr>
              </table>

              <!-- Section Heading: Transcript Stream -->
              <div style="margin-bottom: 14px; border-right: 4px solid #D4AF37; padding-right: 10px;">
                <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #F1F5F9;">
                  💬 نص وحوار المحادثة الموثقة
                </h3>
              </div>

              <!-- Transcript Chat Bubbles Stream -->
              <div style="background: #080d1a; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 14px; padding: 18px; margin-bottom: 24px;">
                ${bubblesHtml}
              </div>

              <!-- Action Links & Self-Service -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" style="padding: 6px;">
                    <a href="https://services.bahrain.bh" target="_blank" style="background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%); color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; display: inline-block; box-shadow: 0 4px 14px rgba(29, 78, 216, 0.4);">
                      🌐 بوابة الخدمات الإلكترونية
                    </a>
                  </td>
                  <td align="center" style="padding: 6px;">
                    <a href="https://services.bahrain.bh" target="_blank" style="background: rgba(255, 255, 255, 0.08); color: #F1F5F9; border: 1px solid rgba(255, 255, 255, 0.15); padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">
                      🔍 متابعة حالة المعاملات
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Customer Support Card -->
              <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 10px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #F6E05E; font-weight: 700;">
                  📞 مركز الاتصال وخدمة العملاء (الدفاع المدني)
                </p>
                <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                  للاستفسارات العامة: <strong style="color: #FFFFFF;">17461100</strong> &nbsp;|&nbsp; للطوارئ والبلاغات العاجلة: <strong style="color: #EF4444;">999</strong>
                </p>
              </div>

            </td>
          </tr>

          <!-- Official Directorate Footer -->
          <tr>
            <td style="background-color: #070b14; padding: 20px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748B;">
                هذه رسالة موثقة صادرة تلقائياً عن منظومة الذكاء الاصطناعي التفاعلية للإدارة العامة للدفاع المدني بمملكة البحرين.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                © 2026 الإدارة العامة للدفاع المدني - وزارة الداخلية - مملكة البحرين. جميع الحقوق محفوظة.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

module.exports = {
  generateTranscriptEmailHtml,
  formatDialogueBubbles,
  escapeHtml
};
