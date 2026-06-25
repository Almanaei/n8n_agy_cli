const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const clientEmail = "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCgAKA3Jh5/C+wK
g0R6az/dvjzeeMF6XgpNKuMrnvanoBRYu1hvncRqfIZEmaPk3aNBxMyTmnj3KFJa
yWJNFdaARb8uANoqd2fpglb36lizEBgAciZ4MEjBDCAuiv2C66S2sUFvMvDy9r8i
E5zGxizSSTSgoGSFjTI6BO9cDS3xnq4lgO/YkcS/z0zhni5/4uktIfhjqZtTafwJ
PyOpbGWapdJULJo5Q+X6PYWqBBvTeK2GguR9QLB9QuQdGqvTEMEB3STbYsXgLn+N
cc6bTLDW2KxJwONiZELpYsSJrkP32HIe7ZKqnrfE6A2z7s1r43aDwKe9khQ2/hYl
b/aRX0zxAgMBAAECggEABut8AmKWSU+YT+yVMLe0eYg9nPALSxnn12ZKUKPFfmKq
mptQo/Qmb2YPDwa3i0GIKuMiZ2RUBLl0VVuWEigmgKHzlp9gEBvdrUBPN1Xl6+mf
Zh6JuiM5dErsVeL6O5gqJaIVJsRk3hcslUJUopalz9rtaSCCtHFyuYZm3TvvL57I
G6+o3RccyrKdSma2WljpRuRjYFK9KmOULEKEbij0pNJdjqdeAO+BZ7U0nQRAQlVr
uc1kr40nX5ICKbfPMe0OvpwwemooPqGOr22m8z7npOHIRJBxuvtPkQEdxfjvd4K/
3mYUtd6qtKmgYxO4lJhwGJ1ZpqhAMUoKd0cmJ6UIWQKBgQDSU9bKhuRMXeEXMAY4
UEfAZRq/FDTd9FZc6dr5EqtZSHRZB+jxqwg+dMTz7xje8aGgacmD4OoeFTQ0pd7A
t9XVtLz6nqXEL9lDrD9tRrLTqrZEYiNxpaJUEIURPd+BweJcQk72ULJZDtc2eA67
oN7uHmFFMyi0xwrhfsCYTlrC+QKBgQDCvzQ0zxPTDuDx8PPfdxTjRodXO3Zd0vre
TffBFFTXGQI8eiRqiPiYVvUlyg9Iy/dnJA1GMnmwxHzauyVNF+NZnJckWIWgTzNe
ionU+5qhXboBXEzdH3ZGSxe6cinUOSAg+vXTwW317uF5kLLFbthCQgozYb4j4Q3t
tcTzDF5fuQKBgQCBcmYcyb6SnajeS4lYeVhfuhonBfmvrSTGFIvXhbz9u1EYRn0A
1+HABr/83efxtsdh4hnLV87fau9xg7C/7aTm3VD98kxVnZlbRBTZXYzMJyH8nmXw
GR/6Gxy6ytjXlIuLeqf8gxfxJeggtu1iXxU1em8lVuIzuNkihY9lbbwAiQKBgBgj
UNo2zHM9hd4XCnMpNFqTNFU4low8iUGiklHJLlbWz7MlRHw76+wd4xbC+6//L/QF
wOtxeCnTwNHvnkj27AQAZ69mlXFwP6K5MypF4T2c+2ANy60gqC1AQ3mlis+2IOhV
ksCjWfjAmgvSRoY4He/gdZk2xTV3QJ21COtDHjNpAoGALXo07s3khPVrBHetGyQ/
qJMcL1WmzbTPwzWKiXDKvSYmL/iGvO7T8fp/sFbB2v6juxqAfjx9v0pNVicl1Qal
WQTD3N8zAs+SVVR8ZIqqNKOZhHBWtLy5SKWcntjouHsPdIh6dtYs97nFxfXjck8e
erra6BzpXyWJxdylk4cdvD0=
-----END PRIVATE KEY-----`;
const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
const telemetryDbPath = path.join(__dirname, 'telemetry_db.json');

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

async function main() {
  console.log("=== ElevenLabs Telemetry Historical Bootstrapper ===");
  
  // 1. Load telemetry db to see what is already evaluated
  let telemetryData = [];
  if (fs.existsSync(telemetryDbPath)) {
    try {
      telemetryData = JSON.parse(fs.readFileSync(telemetryDbPath, 'utf8'));
    } catch (e) {
      console.error("Error reading telemetry_db.json, starting fresh:", e);
    }
  }
  
  const existingIds = new Set(telemetryData.map(item => item.conversation_id));
  console.log(`Loaded ${existingIds.size} existing evaluations from telemetry_db.json.`);

  // 2. Fetch rows from Google Sheet
  console.log("Fetching rows from Google Sheets...");
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
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:H1000`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  
  if (!getRes.ok) {
    throw new Error(`Failed to fetch sheet values: ${getRes.status} ${await getRes.text()}`);
  }
  
  const getData = await getRes.json();
  const rows = getData.values || [];
  console.log(`Fetched ${rows.length} rows from the sheet.`);
  
  // 3. Extract unique real ElevenLabs conversation IDs
  const convIds = new Set();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const conversationId = row[4];
    if (conversationId && conversationId.startsWith("conv_") && !conversationId.includes("test")) {
      convIds.add(conversationId);
    }
  }
  
  const missingIds = Array.from(convIds).filter(id => !existingIds.has(id));
  console.log(`Found ${convIds.size} unique real ElevenLabs conversations in sheet.`);
  console.log(`Out of these, ${missingIds.length} are missing from telemetry_db.json.`);
  
  if (missingIds.length === 0) {
    console.log("All conversation IDs are already evaluated. Nothing to bootstrap!");
    return;
  }
  
  // 4. Sequentially run the evaluation script for missing IDs
  console.log(`Starting sequential evaluations for ${missingIds.length} conversation IDs...`);
  
  // We'll use the same Python path as the start_all.js script: C:\Python313\python.exe
  const pythonPath = "C:\\Python313\\python.exe";
  const evalScript = path.join(__dirname, 'eval_elevenlabs.py');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let idx = 0; idx < missingIds.length; idx++) {
    const conId = missingIds[idx];
    console.log(`[${idx + 1}/${missingIds.length}] Evaluating ${conId}...`);
    
    // Spawn Python evaluation script synchronously
    const result = spawnSync(pythonPath, [evalScript, conId], { encoding: 'utf-8' });
    
    if (result.status === 0) {
      console.log(`Successfully evaluated ${conId}`);
      successCount++;
    } else {
      console.error(`Failed to evaluate ${conId}. Error code: ${result.status}`);
      console.error(result.stderr || result.stdout);
      failCount++;
    }
    
    // Tiny delay to respect API rate limits
    if (idx < missingIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\nBootstrap complete. Success: ${successCount}, Failures: ${failCount}`);
}

main().catch(err => {
  console.error("Bootstrapper failed with error:", err);
  process.exit(1);
});
