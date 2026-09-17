// src/routes/signed_url_controller.js - Signed WebRTC Session Token Handler for ElevenLabs
const { getCachedGoogleAccessToken } = require('../services/google_sheets_client');
const { resolveArabicStatusName } = require('../services/services_registry');
const { SPREADSHEET_ID, SHEET_NAME } = require('../services/applications_repository');

async function handleGetSignedUrl(req, res, { apiKey, agentId, clientEmail, privateKey }) {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const phoneParam = urlObj.searchParams.get('phone');
    const appIdParam = urlObj.searchParams.get('appId');

    const elevenUrl = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`;
    const response = await fetch(elevenUrl, {
      headers: { "xi-api-key": apiKey }
    });

    if (!response.ok) {
      const errText = await response.text();
      res.writeHead(response.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: errText }));
      return;
    }

    const data = await response.json();

    // Silent Pre-Lookup for Returning Web Session
    let preLookup = { found: false };
    if (phoneParam || appIdParam) {
      try {
        const accessToken = await getCachedGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);
        const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:Z2000`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const sheetsData = await getRes.json();
        const rows = sheetsData.values || [];

        const cleanPhone = phoneParam ? phoneParam.replace(/[^0-9]/g, '') : '';
        const matchedRow = rows.slice(1).reverse().find(row => {
          if (appIdParam && row[0] && row[0].toLowerCase().trim() === appIdParam.toLowerCase().trim()) return true;
          if (cleanPhone && cleanPhone.length >= 8 && row[5]) {
            const rowPhone = row[5].replace(/[^0-9]/g, '');
            if (!rowPhone || rowPhone.length < 8) return false;
            return rowPhone.slice(-8) === cleanPhone.slice(-8);
          }
          return false;
        });

        if (matchedRow) {
          const rawStatus = (matchedRow[12] || 'Pending').trim();
          const statusAr = resolveArabicStatusName(rawStatus);
          const clientName = `${matchedRow[3] || ''} ${matchedRow[4] || ''}`.trim() || 'العزيز';
          preLookup = {
            found: true,
            appId: matchedRow[0],
            clientName: clientName,
            serviceName: matchedRow[2],
            status: rawStatus,
            statusAr: statusAr,
            timestamp: matchedRow[1] || '',
            decisionDate: matchedRow[18] || '',
            slaCompletionTime: matchedRow[19] || '',
            userPauseDuration: matchedRow[20] || '',
            greetingAr: `أهلاً بك ${clientName}! أرى أن لديك طلباً نشطاً لخدمة (${matchedRow[2]}) وحالته الحالية هي (${statusAr}). كيف يمكنني مساعدتك اليوم؟`,
            greetingEn: `Welcome back ${clientName}! I see you have an active application for ${matchedRow[2]} currently (${rawStatus}). How can I help you today?`
          };
        }
      } catch (e) {
        console.error("[Signed URL Controller] Error in silent pre-lookup:", e);
      }
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ ...data, pre_lookup: preLookup }));
  } catch (error) {
    console.error("[Signed URL Controller] Error fetching signed URL:", error);
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = {
  handleGetSignedUrl
};
