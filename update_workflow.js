const fs = require('fs');
const path = require('path');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const workflowId = "VBjr7VIF75yUyP45";
const apiUrl = `http://localhost:5678/api/v1/workflows/${workflowId}`;
const jsonFilePath = path.join(__dirname, `workflow_${workflowId}.json`);

const newFormatWhatsappCode = `const items = $input.all();
// Find the match that has a valid email, or fall back to the last matching row
let lead = items.find(item => item.json['Client Email'] && item.json['Client Email'].includes('@'))?.json;
if (!lead && items.length > 0) {
  lead = items[items.length - 1].json;
}

const webhookBody = $('ElevenLabs Post-Call Webhook').first().json.body || {};
const transcript = webhookBody.data?.transcript || webhookBody.transcript || [];

// Helper function to extract email from text
function extractEmail(text) {
  if (!text) return null;
  let normalized = text.replace(/\\[at\\]/gi, '@').replace(/\\s+at\\s+/gi, '@');
  normalized = normalized.replace(/\\[dot\\]/gi, '.').replace(/\\s+dot\\s+/gi, '.');
  const emailRegex = /[a-zA-Z0-9._%+-]+\\s*@\\s*[a-zA-Z0-9.-]+\\s*\\.\\s*[a-zA-Z]{2,}/g;
  const matches = normalized.match(emailRegex);
  return matches && matches.length > 0 ? matches[0].replace(/\\s+/g, '') : null;
}

// Clean the email address from lead/sheet if it exists
let clientEmail = lead ? (lead['Client Email'] || '') : '';
if (clientEmail) {
  clientEmail = clientEmail.replace(/\\[at\\]/gi, '@').replace(/\\s+/g, '');
}

// Combine all transcript messages to check for spoken email and request keywords
let allTranscriptText = '';
const formatted = transcript
  .filter(t => t.message || t.original_message)
  .map(t => {
    const role = t.role === 'user' ? 'العميل' : 'المساعد';
    const msg = t.original_message || t.message || '';
    allTranscriptText += ' ' + msg;
    return \`*\${role}*: \${msg}\`;
  }).join('\\n\\n');

// If email not found in sheet, try to extract from transcript
if (!clientEmail || !clientEmail.includes('@')) {
  const extracted = extractEmail(allTranscriptText);
  if (extracted) {
    clientEmail = extracted;
  }
}

// Check if user requested to send the chat on email
const userMessages = transcript
  .filter(t => t.role === 'user')
  .map(t => (t.original_message || t.message || '').toLowerCase());

const emailKeywords = ['إيميل', 'ايميل', 'البريد', 'بريد', 'email', 'mail'];
const keywordRequested = userMessages.some(msg => 
  emailKeywords.some(keyword => msg.includes(keyword))
);
const sendEmailRequested = keywordRequested || (clientEmail && clientEmail.includes('@'));

// Clean and format phone number for WhatsApp E.164 compatibility
let phone = String(lead ? lead['Phone Number'] || "" : "");
phone = phone.replace(/\\s+/g, '').replace('+', '');

if (phone.length === 8 && (phone.startsWith('3') || phone.startsWith('6') || phone.startsWith('1'))) {
  // If it's a local Bahraini mobile/landline, add the country code 973
  phone = '973' + phone;
}

const whatsappNumber = phone ? \`whatsapp:+\${phone}\` : '';

return [{
  json: {
    ...(lead || {}),
    'Client Email': clientEmail,
    whatsappNumber,
    formattedTranscript: formatted,
    sendEmailRequested
  }
}];`;

const newEmailExistsCode = `return $input.all().filter(item => {
  const email = item.json['Client Email'];
  const hasEmail = email && typeof email === 'string' && email.includes('@');
  const requested = item.json.sendEmailRequested === true;
  return hasEmail && requested;
});`;

function updateNodeList(nodes) {
  let formatUpdated = false;
  let emailExistsUpdated = false;
  
  for (const node of nodes) {
    if (node.name === "Format WhatsApp Payload") {
      node.parameters = node.parameters || {};
      node.parameters.jsCode = newFormatWhatsappCode;
      formatUpdated = true;
    } else if (node.name === "Email Exists?") {
      node.parameters = node.parameters || {};
      node.parameters.jsCode = newEmailExistsCode;
      emailExistsUpdated = true;
    }
  }
  return { formatUpdated, emailExistsUpdated };
}

async function run() {
  console.log("Loading workflow JSON file...");
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`Workflow file not found at ${jsonFilePath}`);
    return;
  }
  
  const content = fs.readFileSync(jsonFilePath, 'utf8');
  const workflow = JSON.parse(content);
  
  console.log("Modifying workflow nodes on disk...");
  const updateNodesRes = updateNodeList(workflow.nodes);
  console.log(`Main nodes updated: Format WhatsApp Payload: ${updateNodesRes.formatUpdated}, Email Exists?: ${updateNodesRes.emailExistsUpdated}`);
  
  if (workflow.activeVersion && workflow.activeVersion.nodes) {
    const updateActiveRes = updateNodeList(workflow.activeVersion.nodes);
    console.log(`ActiveVersion nodes updated: Format WhatsApp Payload: ${updateActiveRes.formatUpdated}, Email Exists?: ${updateActiveRes.emailExistsUpdated}`);
  }
  
  // Save changes back to disk
  fs.writeFileSync(jsonFilePath, JSON.stringify(workflow, null, 2), 'utf8');
  console.log(`Saved updated workflow to ${jsonFilePath}`);
  
  // Construct clean payload for n8n API (excluding read-only metadata fields to avoid errors)
  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: {
      executionOrder: workflow.settings?.executionOrder || "v1"
    }
  };
  
  console.log("Uploading updated workflow to local n8n instance...");
  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    console.error(`Failed to update workflow: ${response.status} - ${await response.text()}`);
    return;
  }
  
  console.log("Workflow successfully uploaded!");
  
  console.log("Activating workflow...");
  const activateResponse = await fetch(`${apiUrl}/activate`, {
    method: "POST",
    headers: {
      "X-N8N-API-KEY": apiKey
    }
  });
  
  if (activateResponse.ok) {
    console.log("Workflow successfully activated! ✅");
  } else {
    console.error(`Failed to activate workflow: ${activateResponse.status} - ${await activateResponse.text()}`);
  }
}

run().catch(err => console.error(err));
