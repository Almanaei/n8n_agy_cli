// src/services/applications_repository.js - Google Sheets CRUD Repository for Service Applications & Leads
const { getCachedGoogleAccessToken } = require('./google_sheets_client');
const {
  resolveService,
  formatDynamicFields
} = require('./services_registry');
const {
  formatHyperlinkCell
} = require('../utils/url_utils');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
const SHEET_NAME = "ServiceApplications";
const LEADS_SHEET_NAME = "Sheet1";

// Cache structure for sheet rows
const sheetRowsCache = new Map();
const CACHE_TTL_MS = 2500;

function getCachedSheetRows(cacheKey) {
  const cached = sheetRowsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }
  return null;
}

function setCachedSheetRows(cacheKey, data) {
  sheetRowsCache.set(cacheKey, {
    data: data,
    timestamp: Date.now()
  });
}

function invalidateSheetCache() {
  sheetRowsCache.clear();
}

function parseTimestampToMs(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const trimmed = dateStr.trim();
  if (!trimmed) return 0;

  const match = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    return Date.UTC(year, month, day, hour, minute, second);
  }

  const isoMs = Date.parse(trimmed);
  if (!isNaN(isoMs)) return isoMs;

  return 0;
}

function formatDocumentAuditHistoryText(auditHistory) {
  if (!auditHistory) return "";
  if (typeof auditHistory === 'string') return auditHistory;
  if (!Array.isArray(auditHistory) || auditHistory.length === 0) return "";
  return auditHistory.map(doc => {
    const timeStr = doc.uploadedAt || new Date().toISOString();
    return `• ${doc.name || 'document.pdf'} [${doc.action || 'Initial Upload'}] (${timeStr}) - ${doc.url || '#'}`;
  }).join('\n');
}

async function appendServiceApplication(appData, credentials = {}) {
  const clientEmail = credentials.clientEmail || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (credentials.privateKey || process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
  const adminSecretKey = process.env.ADMIN_SECRET || "cd_admin_secure_pass_2026";

  const accessToken = await getCachedGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);

  const resolvedService = resolveService(appData.serviceName);
  let finalServiceName = appData.serviceName || "";
  if (resolvedService && appData.serviceName === resolvedService.id) {
    finalServiceName = resolvedService.canonicalEn;
  }

  const dynamicFieldsStr = formatDynamicFields(appData.serviceName, appData.dynamicFields);
  const baseUrl = (process.env.PUBLIC_URL && !process.env.PUBLIC_URL.includes('localhost')) ? process.env.PUBLIC_URL.trim() : 'https://bhcdai.com';

  let attachmentLinkCell = "";
  if (appData.attachmentLink && appData.attachmentLink.trim()) {
    const rawLinks = appData.attachmentLink.split(',').map(s => s.trim()).filter(Boolean);
    if (rawLinks.length === 1) {
      attachmentLinkCell = formatHyperlinkCell(rawLinks[0], "📄 عرض المستند المرفق");
    } else if (rawLinks.length > 1) {
      attachmentLinkCell = formatHyperlinkCell(rawLinks[0], `📄 فتح المستندات (${rawLinks.length} ملفات)`);
    }
  }

  let trackingLinkCell = "";
  if (appData.trackingLink && appData.trackingLink.trim()) {
    trackingLinkCell = formatHyperlinkCell(appData.trackingLink.trim(), "🔗 رابط التتبع");
  }

  const rowValues = [
    appData.appId,
    appData.timestamp,
    finalServiceName,
    appData.firstName,
    appData.lastName,
    appData.whatsapp,
    appData.email,
    appData.referenceNumber || "",
    attachmentLinkCell,
    trackingLinkCell,
    dynamicFieldsStr,
    appData.paymentMethod,
    appData.status || "Submitted",
    appData.notes || "",
    appData.status || "Submitted",
    "", // Col P
    "", // Col Q
    `=HYPERLINK("${baseUrl}/admin/quick-action?id=${appData.appId}&key=${adminSecretKey}", "⚡ Quick Action")`, // Col R
    "", // Col S
    "", // Col T
    "", // Col U
    "", // Col V
    typeof appData.documentAuditHistory === 'string' ? appData.documentAuditHistory : JSON.stringify(appData.documentAuditHistory || [])
  ];

  const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:W:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [rowValues] })
  });
  if (!appendRes.ok) {
    throw new Error(`Failed to append row: ${appendRes.status} ${await appendRes.text()}`);
  }
  invalidateSheetCache();
}

async function getServiceApplication(appId, credentials = {}) {
  const clientEmail = credentials.clientEmail || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (credentials.privateKey || process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');

  const accessToken = await getCachedGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);

  let rows = getCachedSheetRows("ServiceApplications_A1_X2000");
  if (!rows) {
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:X2000`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    if (!getRes.ok) throw new Error("Failed to read sheet rows");
    const data = await getRes.json();
    rows = data.values || [];
    setCachedSheetRows("ServiceApplications_A1_X2000", rows);
  }

  const rowIndex = rows.findIndex(row => row[0] === appId);
  if (rowIndex === -1) return null;
  const row = rows[rowIndex];

  let documentAuditHistory = [];
  if (row[22]) {
    if (typeof row[22] === 'string' && row[22].trim().startsWith('[')) {
      try { documentAuditHistory = JSON.parse(row[22]); } catch (e) { documentAuditHistory = []; }
    } else if (Array.isArray(row[22])) {
      documentAuditHistory = row[22];
    } else if (typeof row[22] === 'string') {
      const lines = row[22].split('\n').filter(l => l.trim());
      const links = (row[8] || '').split(',').map(l => l.trim());
      documentAuditHistory = lines.map((line, idx) => {
        const isLatest = idx === lines.length - 1;
        const fileUrl = links[idx] || links[links.length - 1] || '#';
        const dateMatch = line.match(/\((.*?)\)/);
        const nameClean = line.replace(/^[•\-\s]+/, '').replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
        return {
          name: nameClean || `document_${idx + 1}.pdf`,
          url: fileUrl,
          uploadedAt: dateMatch ? dateMatch[1] : (row[1] || ''),
          action: isLatest ? 'Latest Document' : 'Previous Submission'
        };
      });
    }
  }

  let callSummaryHistory = [];
  if (row[23]) {
    try {
      callSummaryHistory = typeof row[23] === 'string' && row[23].trim().startsWith('[') ? JSON.parse(row[23]) : [];
    } catch (e) {
      callSummaryHistory = [];
    }
  }

  return {
    rowIndex: rowIndex + 1,
    appId: row[0],
    timestamp: row[1],
    serviceName: row[2],
    firstName: row[3],
    lastName: row[4],
    whatsapp: row[5],
    email: row[6],
    referenceNumber: row[7],
    attachmentLink: row[8],
    trackingLink: row[9],
    dynamicFields: row[10],
    paymentMethod: row[11],
    status: row[12],
    notes: row[13],
    alertSent: row[14],
    adminModificationRequest: row[15] || "",
    userModificationResponse: row[16] || "",
    quickActionLink: row[17] || "",
    decisionDate: row[18] || "",
    slaCompletionTime: row[19] || "",
    userPauseDuration: row[20] || "",
    modRequestSentAt: row[21] || "",
    documentAuditHistory: documentAuditHistory,
    callSummaryHistory: callSummaryHistory
  };
}

module.exports = {
  SPREADSHEET_ID,
  SHEET_NAME,
  LEADS_SHEET_NAME,
  getCachedSheetRows,
  setCachedSheetRows,
  invalidateSheetCache,
  parseTimestampToMs,
  formatDocumentAuditHistoryText,
  appendServiceApplication,
  getServiceApplication
};
