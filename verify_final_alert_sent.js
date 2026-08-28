const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const clientEmail = "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
const sheetName = "ServiceApplications";

// Extract key from server.js dynamically
const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const parts = serverContent.split('-----BEGIN PRIVATE KEY-----');
if (parts.length < 2) {
  console.error("Failed to extract private key from server.js");
  process.exit(1);
}
const keyContent = parts[1].split('-----END PRIVATE KEY-----')[0];
const privateKey = '-----BEGIN PRIVATE KEY-----' + keyContent + '-----END PRIVATE KEY-----';

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

async function getAccessToken() {
  const jwt = generateGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!tokenRes.ok) throw new Error("Auth token exchange failed");
  const data = await tokenRes.json();
  return data.access_token;
}

async function run() {
  console.log("=== STARTING DEDICATED POLLER UPDATE TEST ===");
  const token = await getAccessToken();

  console.log("1. Setting row 4 status to 'Approved' and clearing Alert Sent...");
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: [
        { range: `${sheetName}!M4`, values: [["Approved"]] },
        { range: `${sheetName}!O4`, values: [[""]] }
      ]
    })
  });
  if (!updateRes.ok) throw new Error("Failed to update Sheet cells");
  console.log("✓ Success: Status set to 'Approved'.");

  console.log("2. Waiting 70 seconds for n8n poller to trigger...");
  await new Promise(resolve => setTimeout(resolve, 70000));

  console.log("3. Fetching row 4 values to check Alert Sent flag...");
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A4:P4`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await getRes.json();
  const row = data.values ? data.values[0] : [];
  
  console.log("Current Status:", row[12]);
  console.log("Current Alert Sent Flag:", row[14]);

  if (row[14] === "Yes") {
    console.log("\n=== SUCCESS: n8n poller successfully processed update and marked Alert Sent = Yes! 🎉 ===");
  } else {
    console.error("\n❌ FAILED: Alert Sent flag was not updated to 'Yes'.");
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
