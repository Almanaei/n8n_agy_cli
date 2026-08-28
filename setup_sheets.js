const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Extract Service Account Private Key from server.js dynamically
const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const parts = serverContent.split('-----BEGIN PRIVATE KEY-----');
if (parts.length < 2) {
  console.error("Failed to locate private key in server.js");
  process.exit(1);
}
const keyContent = parts[1].split('-----END PRIVATE KEY-----')[0];
const privateKey = '-----BEGIN PRIVATE KEY-----' + keyContent + '-----END PRIVATE KEY-----';

const clientEmail = "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
const sheetName = "ServiceApplications";
const headers = [
  "Application ID",
  "Timestamp",
  "Service Name",
  "User First Name",
  "User Last Name",
  "User WhatsApp Number",
  "User Email",
  "Reference Number",
  "Attachment Link",
  "Tracking Link",
  "Dynamic Fields",
  "Payment Method",
  "Status",
  "Notes",
  "Alert Sent",
  "Modification Details"
];

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

async function run() {
  console.log("Generating Google API access token...");
  const jwt = generateGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!tokenRes.ok) {
    console.error("Token exchange failed:", await tokenRes.text());
    return;
  }
  const { access_token: accessToken } = await tokenRes.json();

  console.log("Checking spreadsheet metadata...");
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!metaRes.ok) {
    console.error("Failed to fetch spreadsheet metadata:", await metaRes.text());
    return;
  }
  const metadata = await metaRes.json();
  const sheets = metadata.sheets || [];
  const exists = sheets.some(s => s.properties.title === sheetName);

  if (!exists) {
    console.log(`Sheet "${sheetName}" not found. Creating it...`);
    const addSheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: { title: sheetName }
          }
        }]
      })
    });
    if (!addSheetRes.ok) {
      console.error("Failed to create sheet:", await addSheetRes.text());
      return;
    }
    console.log(`Sheet "${sheetName}" successfully created!`);
  } else {
    console.log(`Sheet "${sheetName}" already exists.`);
  }

  console.log("Writing headers unconditionally...");
  const writeHeaderRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:P1?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [headers]
    })
  });
  if (!writeHeaderRes.ok) {
    console.error("Failed to write headers:", await writeHeaderRes.text());
    return;
  }
  console.log("Headers successfully written!");
  console.log("Setup finished successfully! 🎉");
}

run();
