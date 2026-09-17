// src/services/notification_service.js - Multi-Channel Notification Engine (Brevo Email & Twilio SMS)
const fs = require('fs');
const path = require('path');
const {
  sendBrevoEmail,
  sendAdminApplicationNotification,
  sendUserApplicationStatusEmail
} = require('../../scripts/admin_email_notifier');

/**
 * Sends SMS via Twilio with strict lifecycle policy enforcement (Rule 10):
 * Capped strictly at 2 SMS messages per application lifecycle:
 * 1. New Application Submission (isNewApplication = true)
 * 2. Final Decision (isFinalDecision = true e.g. Approved / Rejected)
 */
async function sendTwilioSms({ to, message, isFinalDecision = false, isNewApplication = false }) {
  if (!isNewApplication && !isFinalDecision) {
    console.log(`[Twilio SMS Guard] SMS suppressed for non-decision status update to ${to} (Rule 10 enforcement).`);
    return { status: 'suppressed', reason: 'Rule 10: Maximum 2 SMS per client lifecycle enforced' };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGe1e2e6baaf17b2bec99e959dd83ea99a';

  if (!accountSid || !authToken || !to) {
    console.warn(`[Twilio SMS] Missing credentials or recipient phone number.`);
    return { status: 'skipped', error: 'Missing Twilio credentials' };
  }

  let normalizedPhone = String(to).trim();
  if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = normalizedPhone.startsWith('973') ? `+${normalizedPhone}` : `+973${normalizedPhone}`;
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        MessagingServiceSid: messagingServiceSid,
        To: normalizedPhone,
        Body: message
      })
    });

    const data = await res.json();
    if (res.ok && !data.error_code) {
      console.log(`[Twilio SMS Engine] SMS queued successfully to ${normalizedPhone} (SID: ${data.sid})`);
      return { status: 'sent', sid: data.sid };
    } else {
      console.warn(`[Twilio SMS Engine] Twilio API returned error: ${data.message || res.statusText}`);
      return { status: 'failed', error: data.message };
    }
  } catch (err) {
    console.error(`[Twilio SMS Engine] Dispatch exception: ${err.message}`);
    return { status: 'error', error: err.message };
  }
}

/**
 * Dispatches dual-channel notifications (Universal Email + Conditional SMS)
 */
async function sendDualChannelNotification({ phone, email, appId, trackingLink, clientName, messageText, status }) {
  const isFinal = (status === 'Approved' || status === 'Rejected');
  const isNew = (status === 'Submitted' || status === 'New Application');

  const results = { email: null, sms: null };

  if (email) {
    try {
      results.email = await sendUserApplicationStatusEmail({
        appId,
        email,
        clientName,
        phone,
        status,
        trackingLink,
        reason: messageText
      });
    } catch (e) {
      results.email = { status: 'error', error: e.message };
    }
  }

  if (phone) {
    try {
      results.sms = await sendTwilioSms({
        to: phone,
        message: messageText || `تم تحديث حالة معاملتكم رقم ${appId} لدى الدفاع المدني. الرابط: ${trackingLink}`,
        isNewApplication: isNew,
        isFinalDecision: isFinal
      });
    } catch (e) {
      results.sms = { status: 'error', error: e.message };
    }
  }

  return results;
}

module.exports = {
  sendBrevoEmail,
  sendAdminApplicationNotification,
  sendUserApplicationStatusEmail,
  sendTwilioSms,
  sendDualChannelNotification
};
