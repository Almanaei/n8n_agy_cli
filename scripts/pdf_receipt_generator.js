// scripts/pdf_receipt_generator.js - Official Civil Defense PDF Receipt & Certificate Generator
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

const SVG_LOGO_PATH = path.join(__dirname, '..', 'icons', '64f5d224596566bd337009fc_civil defense.svg');

// Locate available browser executable on Windows/Linux
function getBrowserExecutable() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromePath64 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  const linuxChrome = '/usr/bin/google-chrome';
  const linuxChromium = '/usr/bin/chromium-browser';

  if (fs.existsSync(edgePath)) return edgePath;
  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(chromePath64)) return chromePath64;
  if (fs.existsSync(linuxChrome)) return linuxChrome;
  if (fs.existsSync(linuxChromium)) return linuxChromium;
  return null;
}

async function generateApplicationPdfBuffer(appData, trackingUrl) {
  const isApproved = (appData.status || '').toLowerCase().includes('approved') || appData.status === 'Approved' || appData.status === 'معتمد';
  const appId = appData.appId || 'APP-20260828-0000';
  const targetTrackingUrl = trackingUrl || `http://localhost:3000/track?id=${appId}`;

  // Generate QR Code data URL
  const qrDataUrl = await QRCode.toDataURL(targetTrackingUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 260,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF'
    }
  });

  // Read official SVG Logo
  let svgLogoContent = '';
  if (fs.existsSync(SVG_LOGO_PATH)) {
    svgLogoContent = fs.readFileSync(SVG_LOGO_PATH, 'utf8')
      .replace(/<\?xml.*?\?>/i, '')
      .replace(/<!DOCTYPE.*?>/i, '');
  }

  const primaryColor = isApproved ? '#065F46' : '#0F172A';
  const accentColor = isApproved ? '#10B981' : '#F59E0B';
  const statusBadgeBg = isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const statusBadgeColor = isApproved ? '#059669' : '#D97706';
  const statusBadgeText = isApproved ? 'معتمد وموافق عليه رسمياً ✓ (Approved)' : 'قيد المراجعة والتدقيق الفني ⏳ (Under Review)';

  const mainTitleAr = isApproved 
    ? 'شهادة اعتماد وموافقة الدفاع المدني الرسمية' 
    : 'إشعار استلام وتسجيل طلب خدمة رسمي';
  
  const mainTitleEn = isApproved 
    ? 'OFFICIAL CIVIL DEFENSE APPROVAL CERTIFICATE' 
    : 'OFFICIAL SERVICE APPLICATION ACKNOWLEDGEMENT RECEIPT';

  // Normalize Applicant and Transaction Details
  const clientName = appData.clientName || `${appData.firstName || ''} ${appData.lastName || ''}`.trim() || 'عزيزنا المتعامل';
  const refNumber = appData.referenceNumber || appData.crNumber || appData.refNumber || 'غير متوفر';
  const email = appData.email || appData.clientEmail || 'غير متوفر';
  
  // Robust Phone Extraction and E.164 Formatting
  const rawPhone = appData.whatsapp || appData.phone || appData.phoneNumber || appData.userPhone || '';
  let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
  if (cleanPhone.length === 8) cleanPhone = '973' + cleanPhone;
  const formattedPhone = cleanPhone ? `+${cleanPhone}` : (rawPhone || 'غير متوفر');
  
  const paymentMethod = appData.paymentMethod || 'رابط دفع إلكتروني (BenefitPay / Card)';
  const submissionDate = appData.timestamp || appData.createdAt || new Date().toLocaleString('ar-BH');

  // Format Dynamic Fields if Object
  let dynamicFieldsHtml = '';
  if (appData.dynamicFields) {
    if (typeof appData.dynamicFields === 'object') {
      const entries = Object.entries(appData.dynamicFields);
      if (entries.length > 0) {
        dynamicFieldsHtml = entries.map(([k, v]) => `${k}: <strong>${v}</strong>`).join(' • ');
      }
    } else {
      dynamicFieldsHtml = String(appData.dynamicFields);
    }
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${appId} - Civil Defense Official Certificate</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      background: #FFFFFF;
      -webkit-font-smoothing: antialiased;
      direction: rtl;
      text-align: right;
    }

    .certificate-frame {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm 14mm 10mm 14mm;
      background: #FFFFFF;
      position: relative;
      border: 4px double #1E3A8A;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .inner-border {
      position: absolute;
      top: 3mm;
      left: 3mm;
      right: 3mm;
      bottom: 3mm;
      border: 1px solid #c5a153;
      pointer-events: none;
    }

    .corner {
      position: absolute;
      width: 14mm;
      height: 14mm;
      border-color: #c5a153;
      border-style: solid;
      pointer-events: none;
    }

    .corner.top-left { top: 4mm; left: 4mm; border-width: 2px 0 0 2px; }
    .corner.top-right { top: 4mm; right: 4mm; border-width: 2px 2px 0 0; }
    .corner.bottom-left { bottom: 4mm; left: 4mm; border-width: 0 0 2px 2px; }
    .corner.bottom-right { bottom: 4mm; right: 4mm; border-width: 0 2px 2px 0; }

    .header-section {
      text-align: center;
      margin-bottom: 3mm;
    }

    .logo-container {
      width: 75px;
      height: 90px;
      margin: 0 auto 2mm auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-container svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .ministry-title-ar {
      font-size: 16px;
      font-weight: 800;
      color: #1E3A8A;
      margin: 0;
      letter-spacing: 0.2px;
    }

    .directorate-title-ar {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin: 2px 0 0 0;
    }

    .ministry-title-en {
      font-size: 10px;
      font-weight: 700;
      color: #64748B;
      margin: 2px 0 0 0;
      letter-spacing: 0.8px;
    }

    .ribbon-banner {
      background: ${primaryColor};
      border: 2px solid ${accentColor};
      border-radius: 6px;
      padding: 6px 12px;
      text-align: center;
      margin: 4mm 0;
    }

    .ribbon-title-ar {
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 800;
      margin: 0;
    }

    .ribbon-title-en {
      color: #FCD34D;
      font-size: 9.5px;
      font-weight: 700;
      margin: 2px 0 0 0;
      letter-spacing: 0.5px;
    }

    .status-container {
      text-align: center;
      margin-bottom: 3mm;
    }

    .status-pill {
      display: inline-block;
      background: ${statusBadgeBg};
      border: 1.5px solid ${statusBadgeColor};
      color: ${statusBadgeColor};
      font-size: 11.5px;
      font-weight: 800;
      padding: 3px 16px;
      border-radius: 20px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4mm;
      border: 1.5px solid #E2E8F0;
      background: #FFFFFF;
    }

    .data-table th {
      background: #F8FAFC;
      color: #1E3A8A;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 10px;
      border: 1px solid #CBD5E1;
      text-align: right;
    }

    .data-table td {
      padding: 5.5px 10px;
      border: 1px solid #E2E8F0;
      font-size: 11px;
    }

    .label-col {
      width: 38%;
      background: #F8FAFC;
      color: #334155;
      font-weight: 700;
    }

    .label-sub {
      display: block;
      font-size: 8.5px;
      color: #64748B;
      font-weight: 600;
    }

    .value-col {
      width: 62%;
      color: #0F172A;
      font-weight: 600;
    }

    .verification-box {
      border: 1.5px solid #CBD5E1;
      border-radius: 8px;
      padding: 3.5mm 5mm;
      background: #F8FAFC;
      margin-bottom: 4mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4mm;
    }

    .verification-info {
      flex: 1;
    }

    .verification-title {
      font-size: 11px;
      font-weight: 800;
      color: #1E3A8A;
      margin: 0 0 2px 0;
    }

    .verification-desc {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
      margin: 0 0 4px 0;
    }

    .tracking-link-pill {
      display: inline-block;
      background: #E2E8F0;
      color: #1E3A8A;
      font-family: monospace;
      font-size: 8.5px;
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }

    .qr-side {
      width: 25mm;
      height: 25mm;
      background: #FFFFFF;
      padding: 1mm;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .footer-section {
      border-top: 1.5px solid #c5a153;
      padding-top: 3mm;
      text-align: center;
    }

    .footer-seal {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      margin: 0 0 2px 0;
    }

    .footer-cert-id {
      font-family: monospace;
      font-size: 9px;
      color: #1E3A8A;
      font-weight: 700;
      margin: 2px 0;
    }

    .footer-copyright {
      font-size: 8.5px;
      color: #94A3B8;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="certificate-frame">
    <div class="inner-border"></div>
    <div class="corner top-left"></div>
    <div class="corner top-right"></div>
    <div class="corner bottom-left"></div>
    <div class="corner bottom-right"></div>

    <!-- Header Section -->
    <div class="header-section">
      <div class="logo-container">
        ${svgLogoContent}
      </div>
      <h1 class="ministry-title-ar">مملكة البحرين - وزارة الداخلية</h1>
      <h2 class="directorate-title-ar">الإدارة العامة للدفاع المدني</h2>
      <p class="ministry-title-en">KINGDOM OF BAHRAIN - MINISTRY OF INTERIOR<br>GENERAL DIRECTORATE OF CIVIL DEFENSE</p>
    </div>

    <!-- Main Title Ribbon -->
    <div class="ribbon-banner">
      <h3 class="ribbon-title-ar">${mainTitleAr}</h3>
      <p class="ribbon-title-en">${mainTitleEn}</p>
    </div>

    <!-- Status Badge -->
    <div class="status-container">
      <span class="status-pill">${statusBadgeText}</span>
    </div>

    <!-- Core Data Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th colspan="2">بيانات المعاملة الرسمية / Official Application Details</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-col">
            رقم المعاملة
            <span class="label-sub">Application Reference ID</span>
          </td>
          <td class="value-col" style="font-family: monospace; color: #1E3A8A; font-size: 13px;">${appId}</td>
        </tr>
        <tr>
          <td class="label-col">
            نوع الخدمة
            <span class="label-sub">Requested Service Type</span>
          </td>
          <td class="value-col" style="color: #0F172A; font-weight: 800;">${appData.serviceName || 'خدمة الدفاع المدني'}</td>
        </tr>
        <tr>
          <td class="label-col">
            الاسم الكامل
            <span class="label-sub">Applicant Full Name</span>
          </td>
          <td class="value-col">${clientName}</td>
        </tr>
        <tr>
          <td class="label-col">
            رقم السجل / المرجع
            <span class="label-sub">CR / CPR Reference No.</span>
          </td>
          <td class="value-col">${refNumber}</td>
        </tr>
        <tr>
          <td class="label-col">
            رقم الهاتف
            <span class="label-sub">Phone / WhatsApp Number</span>
          </td>
          <td class="value-col" style="direction: ltr; text-align: right;">${formattedPhone}</td>
        </tr>
        <tr>
          <td class="label-col">
            البريد الإلكتروني
            <span class="label-sub">Email Address</span>
          </td>
          <td class="value-col" style="direction: ltr; text-align: right;">${email}</td>
        </tr>
        <tr>
          <td class="label-col">
            تاريخ التقديم
            <span class="label-sub">Submission Date & Time</span>
          </td>
          <td class="value-col">${submissionDate}</td>
        </tr>
        ${(isApproved && appData.decisionDate) ? `
        <tr>
          <td class="label-col" style="background: #F0FDF4; color: #166534;">
            تاريخ الاعتماد والموافقة
            <span class="label-sub" style="color: #15803D;">Official Decision / Approval Date</span>
          </td>
          <td class="value-col" style="color: #166534; font-weight: 800;">${appData.decisionDate}</td>
        </tr>
        ` : ''}
        <tr>
          <td class="label-col">
            طريقة الدفع
            <span class="label-sub">Payment Method</span>
          </td>
          <td class="value-col">${paymentMethod}</td>
        </tr>
        ${dynamicFieldsHtml ? `
        <tr>
          <td class="label-col">
            المواصفات الفنية
            <span class="label-sub">Technical Details</span>
          </td>
          <td class="value-col" style="font-size: 10px; color: #475569;">${dynamicFieldsHtml}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <!-- Digital QR Verification Box -->
    <div class="verification-box">
      <div class="verification-info">
        <h4 class="verification-title">رمز التحقق الرقمي الرسمي (Official Digital QR Verification)</h4>
        <p class="verification-desc">
          امسح الرمز بواسطة كاميرا الهاتف للاطلاع على السجل الحي المعتمد وحالة المعاملة الرسمية مباشرة على بوابة الدفاع المدني.
        </p>
        <div class="tracking-link-pill">${targetTrackingUrl}</div>
      </div>
      <div class="qr-side">
        <img src="${qrDataUrl}" alt="QR Verification" class="qr-image">
      </div>
    </div>

    <!-- Official Legal Footer -->
    <div class="footer-section">
      <p class="footer-seal">
        مستند إلكتروني رسمي معتمد وموثق رقمياً من قبل الإدارة العامة للدفاع المدني بمملكة البحرين.
      </p>
      <div class="footer-cert-id">
        Official Digital Certificate ID: CD-BH-${appId}-${Math.random().toString(36).substring(2, 9).toUpperCase()}
      </div>
      <p class="footer-copyright">
        Kingdom of Bahrain - General Directorate of Civil Defense - All Rights Reserved © 2026
      </p>
    </div>

  </div>
</body>
</html>`;

  const browserExe = getBrowserExecutable();
  if (!browserExe) {
    throw new Error("No headless browser (Edge / Chrome) found on host system.");
  }

  const tempDir = os.tmpdir();
  const randomSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const tempHtmlPath = path.join(tempDir, `receipt_${randomSuffix}.html`);
  const tempPdfPath = path.join(tempDir, `receipt_${randomSuffix}.pdf`);

  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

  return new Promise((resolve, reject) => {
    const args = [
      '--headless',
      '--disable-gpu',
      '--run-all-compositor-stages-before-draw',
      '--no-pdf-header-footer',
      `--print-to-pdf=${tempPdfPath}`,
      tempHtmlPath
    ];

    execFile(browserExe, args, (err) => {
      // Clean up temp HTML
      try { fs.unlinkSync(tempHtmlPath); } catch (e) {}

      if (err) {
        try { fs.unlinkSync(tempPdfPath); } catch (e) {}
        return reject(new Error(`PDF conversion failed: ${err.message}`));
      }

      try {
        if (!fs.existsSync(tempPdfPath)) {
          return reject(new Error("PDF file was not created by browser engine."));
        }
        const pdfBuffer = fs.readFileSync(tempPdfPath);
        try { fs.unlinkSync(tempPdfPath); } catch (e) {}
        resolve(pdfBuffer);
      } catch (readErr) {
        reject(readErr);
      }
    });
  });
}

module.exports = { generateApplicationPdfBuffer };
