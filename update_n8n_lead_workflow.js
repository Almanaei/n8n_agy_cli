const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI6MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g';
const realApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g';
const url = 'http://localhost:5678/api/v1/workflows/VBjr7VIF75yUyP45';

async function updateWorkflow() {
  try {
    const r = await fetch(url, { headers: { 'X-N8N-API-KEY': realApiKey } });
    const wf = await r.json();

    const prepNode = wf.nodes.find(n => n.name === 'Prepare Sheets Payload');
    if (prepNode) {
      prepNode.parameters.jsCode = `const rawInput = $('ElevenLabs Webhook').first().json || {};
const body = rawInput.body?.parameters || rawInput.body || rawInput.parameters || rawInput || {};
const existing = $input.item.json || {};
const payload = {};

payload["Conversation ID"] = body.conversationId || body.conversation_id || rawInput.body?.conversationId || rawInput.body?.conversation_id || rawInput.conversationId || rawInput.conversation_id || ("conv_" + Date.now());

const name = body.clientName || body.name || body.client_name || rawInput.clientName || rawInput.name || existing["Client Name"] || "";
if (name) payload["Client Name"] = name;

const phone = body.phoneNumber || body.phone || body.mobile || body.phone_number || rawInput.phoneNumber || rawInput.phone || existing["Phone Number"] || "";
if (phone) payload["Phone Number"] = phone;

let email = body.clientEmail || body.email || body.client_email || rawInput.clientEmail || rawInput.email || existing["Client Email"] || "";
if (email) {
  email = String(email).replace(/\\s*\\[at\\]\\s*/gi, '@').replace(/\\[at\\]/gi, '@').replace(/\\s*\\[dot\\]\\s*/gi, '.').replace(/\\[dot\\]/gi, '.').replace(/\\s+/g, '');
  payload["Client Email"] = email;
}

const pad = (num) => String(num).padStart(2, '0');
const now = new Date();
const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
const bahrain = new Date(utc + (3600000 * 3));
const ms = String(bahrain.getMilliseconds()).padStart(3, '0');
payload["Timestamp"] = existing.Timestamp || (bahrain.getFullYear() + '-' + pad(bahrain.getMonth() + 1) + '-' + pad(bahrain.getDate()) + 'T' + pad(bahrain.getHours()) + ':' + pad(bahrain.getMinutes()) + ':' + pad(bahrain.getSeconds()) + '.' + ms + '+03:00');

payload["Lead Status"] = existing["Lead Status"] || "New Lead";
if (existing["KPI"]) {
  payload["KPI"] = existing["KPI"];
}

return { json: payload };`;
    }

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': realApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings
      })
    });
    const updated = await putRes.json();
    console.log('WORKFLOW VBjr7VIF75yUyP45 UPDATED SUCCESSFULLY! ID:', updated.id, '| Name:', updated.name);
  } catch (e) {
    console.error('Failed to update workflow:', e);
  }
}

updateWorkflow();
