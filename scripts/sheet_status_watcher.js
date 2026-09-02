// scripts/sheet_status_watcher.js - Real-Time Google Sheets Status Change Monitor & Instant Email Dispatcher
const crypto = require('crypto');
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

const { sendUserApplicationStatusEmail } = require('./admin_email_notifier');

const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
const sheetName = "ServiceApplications";
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');

// In-memory state tracking to detect live changes
const statusTracker = new Map();
let isInitialized = false;
let isPolling = false;

function generateGoogleAccessToken(clientEmail, privateKey, scopes) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${base64Header}.${base64Claim}`);
  const signature = sign.sign(privateKey, 'base64url');
  
  return `${base64Header}.${base64Claim}.${signature}`;
}

async function getGoogleSheetsAccessToken() {
  const jwt = generateGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!tokenRes.ok) throw new Error("Google OAuth2 token exchange failed: " + tokenRes.statusText);
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * Scans Google Sheet ServiceApplications for any status changes in Column M
 * and immediately notifies the customer on their email.
 */
async function checkStatusChangesOnce() {
  if (isPolling) return [];
  isPolling = true;

  const dispatchedAlerts = [];

  try {
    const accessToken = await getGoogleSheetsAccessToken();
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:W2000`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!getRes.ok) {
      console.error("[Sheet Status Watcher] Failed to read sheet:", getRes.statusText);
      isPolling = false;
      return [];
    }

    const data = await getRes.json();
    const rows = data.values || [];

    if (rows.length <= 1) {
      isPolling = false;
      return [];
    }

    const updatesToSheet = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const appId = (row[0] || '').trim();
      if (!appId) continue;

      const rowNumber = i + 1;
      const serviceName = row[2] || 'خدمة الدفاع المدني';
      const firstName = row[3] || '';
      const lastName = row[4] || '';
      const whatsapp = row[5] || '';
      const customerEmail = (row[6] || '').trim();
      const trackingLink = row[9] || `http://localhost:3000/track?id=${appId}`;
      const currentStatus = (row[12] || '').trim(); // Column M
      const notes = row[13] || '';
      const alertSent = (row[14] || '').trim(); // Column O
      const adminModRequest = row[15] || ''; // Column P

      const isDefaultInitial = !currentStatus || 
        currentStatus === 'Pending' || 
        currentStatus === 'Submitted' ||
        currentStatus === 'قيد الانتظار' ||
        currentStatus === 'جديد';

      const prev = statusTracker.get(appId);
      const isStatusChanged = prev && prev.status !== currentStatus;
      const isAlertUnsent = alertSent !== 'Yes';

      // Check if we need to dispatch an immediate notification to the customer:
      // 1. Status changed from previous state (e.g. Pending -> Under Review, Under Review -> Approved, etc.)
      // 2. Alert is unsent on non-initial status
      const shouldNotify = (isStatusChanged && !isDefaultInitial) || 
                           (!isDefaultInitial && isAlertUnsent);

      if (shouldNotify) {
        const isModReq = currentStatus.toLowerCase().includes('modification') && !currentStatus.toLowerCase().includes('resubmit');
        const effectiveReason = isModReq ? (adminModRequest || notes || '') : (notes || '');

        console.log(`[Sheet Status Watcher] 🔔 DETECTED STATUS CHANGE for ${appId}:`);
        console.log(`   - Previous Status : '${prev ? prev.status : 'None'}'`);
        console.log(`   - Current Status  : '${currentStatus}' (Column M)`);
        console.log(`   - Customer Email  : <${customerEmail || 'No email'}>`);
        console.log(`   - Reason/Notes    : '${effectiveReason || 'N/A'}'`);

        const recipientEmail = (customerEmail && customerEmail.includes('@')) 
          ? customerEmail 
          : (process.env.ADMIN_EMAIL || 'gdcdvirtual@gmail.com');

        const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";

        // 1. Direct High-Priority Email to Customer
        try {
          const emailRes = await sendUserApplicationStatusEmail({
            appId,
            status: currentStatus,
            serviceName,
            firstName,
            lastName,
            email: recipientEmail,
            whatsapp,
            reason: effectiveReason,
            modificationDetails: effectiveReason,
            trackingLink: `${baseUrl}/track?id=${appId}`,
            certificateLink: `${baseUrl}/receipt?id=${appId}`
          });
          console.log(`[Sheet Status Watcher] ✉️ Customer Email dispatched for ${appId} (${currentStatus}) -> Status:`, emailRes.status);
        } catch (emailErr) {
          console.error(`[Sheet Status Watcher] ❌ Email dispatch error for ${appId}:`, emailErr.message);
        }

        // 2. Direct Cellular SMS Dispatch for Final Decisions (Approved / Rejected) - Rule 10 Enforcement
        const sLower = currentStatus.toLowerCase();
        const isFinalDecision = sLower.includes('approv') || sLower.includes('reject') || sLower.includes('قبول') || sLower.includes('اعتماد') || sLower.includes('رفض');

        if (isFinalDecision && whatsapp) {
          const statusTextAr = (sLower.includes('approv') || sLower.includes('قبول') || sLower.includes('اعتماد')) ? 'مقبول والمعاملة مكتملة' : 'مرفوض';
          const trackingUrl = `${baseUrl}/track?id=${appId}`;
          const smsMsgText = `مرحباً ${firstName || 'عزيزنا المتعامل'}! تم تحديث حالة طلبك رقم (${appId}) لخدمة (${serviceName || 'الدفاع المدني'}) إلى (${statusTextAr}).\nيمكنك متابعة تفاصيل المعاملة مباشرة عبر الرابط التالي:\n${trackingUrl}`;

          try {
            const { sendDualChannelNotification } = require('../server.js');
            sendDualChannelNotification({
              phone: whatsapp,
              appId: `${appId}_${currentStatus}_${Date.now()}`,
              trackingLink: trackingUrl,
              clientName: `${firstName || ''} ${lastName || ''}`.trim() || 'عزيزنا المتعامل',
              messageText: smsMsgText
            }).then(res => console.log(`[Sheet Status Watcher] 📱 Final Decision SMS sent for ${appId} (${currentStatus}):`, res))
              .catch(err => console.error(`[Sheet Status Watcher] ❌ Final Decision SMS error for ${appId}:`, err.message));
          } catch (smsErr) {
            console.error(`[Sheet Status Watcher] ❌ SMS Exception for ${appId}:`, smsErr.message);
          }
        }

        // 3. Queue update to Google Sheets to mark Alert Sent = 'Yes'
        updatesToSheet.push({
          range: `${sheetName}!O${rowNumber}`,
          values: [["Yes"]]
        });

        dispatchedAlerts.push({
          appId,
          status: currentStatus,
          recipient: recipientEmail,
          rowNumber
        });

        // Update in-memory tracker
        statusTracker.set(appId, {
          status: currentStatus,
          alertSent: 'Yes',
          lastNotified: Date.now()
        });
      } else {
        // Record current state if not alerting
        statusTracker.set(appId, {
          status: currentStatus,
          alertSent,
          lastNotified: prev ? prev.lastNotified : null
        });
      }
    }

    // If any alerts were sent, update Google Sheets Column O in batch
    if (updatesToSheet.length > 0) {
      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: updatesToSheet
        })
      });

      if (updateRes.ok) {
        console.log(`[Sheet Status Watcher] ✅ Marked Alert Sent = 'Yes' for ${updatesToSheet.length} rows in Google Sheets.`);
      }
    }

    isInitialized = true;
  } catch (err) {
    console.error("[Sheet Status Watcher] Exception in status check loop:", err.message);
  } finally {
    isPolling = false;
  }

  return dispatchedAlerts;
}

let watcherInterval = null;

function startSheetStatusWatcher(intervalMs = 10000) {
  if (watcherInterval) clearInterval(watcherInterval);
  console.log(`[Sheet Status Watcher] 🚀 Started Real-Time Status Change Watcher (Polling every ${intervalMs / 1000}s)...`);
  
  // Initial check
  checkStatusChangesOnce().catch(err => console.error("[Sheet Status Watcher] Init error:", err));

  // Regular periodic watcher
  watcherInterval = setInterval(() => {
    checkStatusChangesOnce().catch(err => console.error("[Sheet Status Watcher] Periodic poll error:", err));
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
  statusTracker
};
