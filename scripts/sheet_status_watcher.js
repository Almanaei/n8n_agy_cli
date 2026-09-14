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
  // Background polling permanently disabled. Status emails are handled strictly on explicit application/admin actions.
  return [];
}

let watcherInterval = null;

function startSheetStatusWatcher(intervalMs = 10000) {
  console.log("[Sheet Status Watcher] Automated background sheet polling is disabled. Status emails are handled strictly on explicit application/admin actions.");
  return null;
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

function markStatusAlertSent(appId, status) {
  statusTracker.set(appId, {
    status: status,
    alertSent: status,
    lastNotified: Date.now()
  });
}

module.exports = {
  checkStatusChangesOnce,
  startSheetStatusWatcher,
  stopSheetStatusWatcher,
  markStatusAlertSent,
  statusTracker
};
