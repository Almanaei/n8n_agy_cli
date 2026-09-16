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

const { getCachedGoogleAccessToken, generateGoogleAccessToken } = require('../src/services/google_sheets_client');

async function getGoogleSheetsAccessToken() {
  return await getCachedGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);
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
