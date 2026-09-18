// scripts/sheet_status_watcher.js - Real-Time Google Sheets Status Change Monitor & Instant Email Dispatcher
const path = require('path');
const fs = require('fs');

// Load environment variables if not loaded
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
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
} catch (e) {}

const { sendUserApplicationStatusEmail, sendAdminApplicationNotification } = require('./admin_email_notifier');
const { getCachedGoogleAccessToken } = require('../src/services/google_sheets_client');

const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
const sheetName = "ServiceApplications";
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL || "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
let privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');

// In-memory state tracking to detect live changes
const statusTracker = new Map();
let isInitialized = false;
let isPolling = false;
let watcherInterval = null;

function markStatusAlertSent(appId, status) {
  statusTracker.set(appId, {
    status: status,
    alertSent: status,
    lastNotified: Date.now()
  });
}

function resolveServiceTitle(raw) {
  if (!raw) return "خدمة عامة للدفاع المدني";
  const s = String(raw).trim();
  if (s.includes('gas_station') || s.includes('وقود')) return 'إصدار الترخيص لمحطات تزويد الوقود، وتجديد الترخيص';
  if (s.includes('gas_shop') || s.includes('توزيع الغاز') || s.includes('بيع الغاز')) return 'إصدار ترخيص محلات بيع الغاز، وتجديد الترخيص';
  if (s.includes('bakery') || s.includes('مخبز') || s.includes('مخابز')) return 'إصدار ترخيص المخابز الشعبية والآلية، وتجديد الترخيص';
  if (s.includes('gold') || s.includes('ذهب')) return 'إصدار ترخيص محلات وورش الذهب، وتجديد الترخيص';
  if (s.includes('trainee') || s.includes('تدريب')) return 'إصدار الترخيص لمعاهد ومراكز التدريب على أعمال الدفاع المدني';
  return s;
}

/**
 * Scans Google Sheet ServiceApplications for any status changes in Column M
 * and immediately notifies the customer on their email.
 */
async function checkStatusChangesOnce() {
  if (isPolling) return [];
  isPolling = true;

  const detectedChanges = [];

  try {
    const accessToken = await getCachedGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);
    if (!accessToken) {
      isPolling = false;
      return [];
    }

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z2000`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      isPolling = false;
      return [];
    }

    const json = await res.json();
    const rows = json.values || [];

    // First run baseline: snapshot all existing rows so no historical rows get alerted
    if (!isInitialized) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0] || !row[0].trim()) continue;
        const appId = row[0].trim();
        const currentStatus = (row[12] || '').trim();
        statusTracker.set(appId, {
          status: currentStatus,
          alertSent: currentStatus,
          lastNotified: Date.now()
        });
      }
      isInitialized = true;
      console.log(`[Sheet Status Watcher] 🛡️ Baseline initialized for ${statusTracker.size} existing applications. No emails sent for historical rows.`);
      isPolling = false;
      return [];
    }

    const baseUrl = (process.env.PUBLIC_URL && !process.env.PUBLIC_URL.includes('localhost')) ? process.env.PUBLIC_URL.trim() : 'https://bhcdai.com';
    const pendingSheetUpdates = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0] || !row[0].trim()) continue;

      const appId = row[0].trim();
      const currentStatus = (row[12] || '').trim(); // Column M (Status)
      const alertSent = (row[14] || '').trim();     // Column O (Alert Sent)

      if (!currentStatus) continue;

      // Status already marked as alerted
      const prevTracker = statusTracker.get(appId);
      const isAlreadyAlerted = (
        (prevTracker && prevTracker.alertSent === currentStatus) ||
        currentStatus === alertSent ||
        (alertSent === 'Yes' && ['Approved', 'Rejected', 'In Progress', 'Under Review', 'Under Inspection', 'Modification Requested'].includes(currentStatus))
      );

      if (isAlreadyAlerted) {
        if (!prevTracker) {
          statusTracker.set(appId, { status: currentStatus, alertSent: currentStatus, lastNotified: Date.now() });
        }
        continue;
      }

      // Check if this is an active live status change
      const rowNum = i + 1;
      const firstName = row[3] || '';
      const lastName = row[4] || '';
      const phone = row[5] || '';
      const email = (row[6] || '').trim();
      const rawService = row[2] || '';
      const serviceName = resolveServiceTitle(rawService);
      const reason = row[15] || row[13] || ''; // Col P (Admin Mod Request) or Col N (Notes)

      console.log(`[Sheet Status Watcher] 🔍 Live status change detected for ${appId}: '${alertSent}' -> '${currentStatus}' (Client: ${email})`);

      // 1. Mark in memory immediately
      markStatusAlertSent(appId, currentStatus);

      // 2. Queue Google Sheet Column O update to currentStatus
      pendingSheetUpdates.push({
        range: `${sheetName}!O${rowNum}`,
        values: [[currentStatus]]
      });

      // 3. Dispatch Live Email to Customer
      if (email && email.includes('@') && !email.endsWith('@example.com') && !email.endsWith('@test.com')) {
        sendUserApplicationStatusEmail({
          appId,
          status: currentStatus,
          serviceName,
          firstName,
          lastName,
          email,
          whatsapp: phone,
          reason,
          modificationDetails: reason,
          trackingLink: `${baseUrl}/track?id=${appId}`,
          certificateLink: `${baseUrl}/receipt?id=${appId}`
        }).then(r => {
          console.log(`[Sheet Status Watcher] ✉️ Customer email dispatched to <${email}> for ${appId} (${currentStatus}):`, r.status);
        }).catch(err => {
          console.error(`[Sheet Status Watcher] Customer email error for ${appId}:`, err.message);
        });
      }

      // 4. Dispatch Live Email to Admin
      sendAdminApplicationNotification({
        appId,
        status: currentStatus,
        serviceName,
        firstName,
        lastName,
        email,
        whatsapp: phone,
        reason,
        modificationDetails: reason,
        trackingLink: `${baseUrl}/track?id=${appId}`,
        certificateLink: `${baseUrl}/receipt?id=${appId}`,
        quickActionLink: `${baseUrl}/admin/quick-action?id=${appId}&key=${process.env.ADMIN_SECRET_KEY || 'cd_admin_secure_pass_2026'}`
      }).catch(err => {
        console.error(`[Sheet Status Watcher] Admin email error for ${appId}:`, err.message);
      });

      detectedChanges.push({ appId, currentStatus, email });
    }

    // Batch update Google Sheets Column O if any rows changed
    if (pendingSheetUpdates.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: pendingSheetUpdates
        })
      });
      console.log(`[Sheet Status Watcher] ✅ Synced ${pendingSheetUpdates.length} alert statuses to Google Sheet.`);
    }

  } catch (err) {
    console.warn("[Sheet Status Watcher] Polling check encountered error:", err.message);
  } finally {
    isPolling = false;
  }

  return detectedChanges;
}

function startSheetStatusWatcher(intervalMs = 12000) {
  if (watcherInterval) return watcherInterval;

  console.log(`[Sheet Status Watcher] 🚀 Real-time Google Sheet monitor initialized (Polling interval: ${intervalMs / 1000}s).`);
  
  // Initial check after short delay to establish baseline snapshot
  setTimeout(() => {
    checkStatusChangesOnce().catch(() => {});
  }, 2000);

  watcherInterval = setInterval(() => {
    checkStatusChangesOnce().catch(() => {});
  }, intervalMs);

  if (watcherInterval.unref) watcherInterval.unref();
  return watcherInterval;
}

function stopSheetStatusWatcher() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
    console.log("[Sheet Status Watcher] Stopped.");
  }
}

if (require.main === module) {
  startSheetStatusWatcher(10000);
}

module.exports = {
  checkStatusChangesOnce,
  startSheetStatusWatcher,
  stopSheetStatusWatcher,
  markStatusAlertSent,
  statusTracker
};
