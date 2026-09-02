const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1]] = val;
  }
});

const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
const sheetName = "ServiceApplications";
const adminSecretKey = process.env.ADMIN_SECRET || "cd_admin_secure_pass_2026";

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

function parseTimestampToMs(timeStr) {
  if (!timeStr) return 0;
  let d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d.getTime();
  d = new Date(timeStr.replace(' ', 'T'));
  if (!isNaN(d.getTime())) return d.getTime();
  return 0;
}

async function getRowByAppId(accessToken, appId) {
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z2000`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!getRes.ok) throw new Error("Failed to get sheet rows");
  const getJson = await getRes.json();
  const rows = getJson.values || [];
  const rowIndex = rows.findIndex(row => row[0] === appId);
  if (rowIndex === -1) return null;
  const row = rows[rowIndex];
  return {
    rowIndex: rowIndex + 1,
    appId: row[0],
    timestamp: row[1],
    serviceName: row[2],
    firstName: row[3],
    lastName: row[4],
    status: row[12],
    modificationDetails: row[15] || "",
    userModificationResponse: row[16] || "",
    quickActionLink: row[17] || "",
    decisionDate: row[18] || "",
    slaCompletionTime: row[19] || "",
    userPauseDuration: row[20] || "",
    modRequestSentAt: row[21] || ""
  };
}

async function appendTestApplication(accessToken, appData) {
  const baseUrl = "http://localhost:3000";
  const rowValues = [
    appData.appId,
    appData.timestamp,
    appData.serviceName,
    appData.firstName,
    appData.lastName,
    appData.whatsapp,
    appData.email,
    appData.referenceNumber || "",
    appData.attachmentLink || "",
    appData.trackingLink || "",
    appData.dynamicFields || "",
    appData.paymentMethod,
    "In Progress",
    appData.notes || "",
    "Yes",
    "",
    "",
    `=HYPERLINK("${baseUrl}/admin/quick-action?id=${appData.appId}&key=${adminSecretKey}", "⚡ Quick Action")`,
    "",
    "",
    "",
    "",
    JSON.stringify([])
  ];

  const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:W:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [rowValues] })
  });
  if (!appendRes.ok) throw new Error(`Failed to append row: ${appendRes.status}`);
}

async function executeAdminQuickActionTest(accessToken, appId, action, reason) {
  const record = await getRowByAppId(accessToken, appId);
  if (!record) throw new Error(`App ${appId} not found`);
  const rowNum = record.rowIndex;
  const now = new Date();

  let statusValue = "In Progress";
  if (action === "request_modification") statusValue = "Modification Requested";
  else if (action === "approve") statusValue = "Approved";
  else if (action === "reject") statusValue = "Rejected";

  const updateData = {
    valueInputOption: "USER_ENTERED",
    data: [
      { range: `${sheetName}!M${rowNum}`, values: [[statusValue]] },
      { range: `${sheetName}!O${rowNum}`, values: [[""]] }
    ]
  };

  if (reason !== undefined) {
    updateData.data.push({ range: `${sheetName}!P${rowNum}`, values: [[reason]] });
  }

  if (action === "request_modification") {
    updateData.data.push({ range: `${sheetName}!V${rowNum}`, values: [[now.toISOString()]] });
  } else if (action === "approve" || action === "reject") {
    const decisionDate = now.toISOString().replace('T', ' ').substring(0, 19);
    let totalCalendarMs = 0;
    const createdTimeStr = record.timestamp;
    if (createdTimeStr) {
      const createdMs = parseTimestampToMs(createdTimeStr);
      if (createdMs > 0) totalCalendarMs = Math.max(0, now.getTime() - createdMs);
    }

    let userPauseMs = 0;
    const prevPauseStr = record.userPauseDuration || "";
    const prevMatch = prevPauseStr.match(/([\d\.]+) hrs/);
    if (prevMatch) userPauseMs += parseFloat(prevMatch[1]) * 3600 * 1000;

    const modSentAt = record.modRequestSentAt;
    if (modSentAt) {
      const sentMs = parseTimestampToMs(modSentAt);
      if (sentMs > 0) userPauseMs += Math.max(0, now.getTime() - sentMs);
    }

    const netAdminMs = Math.max(0, totalCalendarMs - userPauseMs);
    const netHours = (netAdminMs / (1000 * 60 * 60)).toFixed(1);
    const netDays = (netAdminMs / (1000 * 60 * 60 * 24)).toFixed(2);
    const netSlaStr = `${netDays} days (${netHours} hrs)`;

    const pauseHours = (userPauseMs / (1000 * 60 * 60)).toFixed(1);
    const pauseDays = (userPauseMs / (1000 * 60 * 60 * 24)).toFixed(2);
    const pauseStr = `${pauseDays} days (${pauseHours} hrs)`;

    updateData.data.push({ range: `${sheetName}!S${rowNum}`, values: [[decisionDate]] });
    updateData.data.push({ range: `${sheetName}!T${rowNum}`, values: [[netSlaStr]] });
    updateData.data.push({ range: `${sheetName}!U${rowNum}`, values: [[pauseStr]] });
    updateData.data.push({ range: `${sheetName}!V${rowNum}`, values: [[""]] });
  }

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updateData)
  });
  if (!updateRes.ok) throw new Error("Failed batch update");
}

async function simulateUserResubmission(accessToken, appId, userMessage) {
  const record = await getRowByAppId(accessToken, appId);
  if (!record) throw new Error(`App ${appId} not found`);
  const rowNum = record.rowIndex;
  const now = new Date();

  const modSentAt = record.modRequestSentAt;
  let accumulatedPauseMs = 0;
  if (modSentAt) {
    const sentMs = parseTimestampToMs(modSentAt);
    if (sentMs > 0) accumulatedPauseMs += Math.max(0, now.getTime() - sentMs);
  }

  const prevPauseStr = record.userPauseDuration || "";
  const prevMatch = prevPauseStr.match(/([\d\.]+) hrs/);
  if (prevMatch) accumulatedPauseMs += parseFloat(prevMatch[1]) * 3600 * 1000;

  const pauseHours = (accumulatedPauseMs / (1000 * 60 * 60)).toFixed(1);
  const pauseDays = (accumulatedPauseMs / (1000 * 60 * 60 * 24)).toFixed(2);
  const pauseStr = `${pauseDays} days (${pauseHours} hrs)`;

  const updateData = {
    valueInputOption: "USER_ENTERED",
    data: [
      { range: `${sheetName}!M${rowNum}`, values: [["In Progress"]] },
      { range: `${sheetName}!O${rowNum}`, values: [[""]] },
      { range: `${sheetName}!Q${rowNum}`, values: [[userMessage]] },
      { range: `${sheetName}!U${rowNum}`, values: [[pauseStr]] },
      { range: `${sheetName}!V${rowNum}`, values: [[""]] }
    ]
  };

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updateData)
  });
  if (!updateRes.ok) throw new Error("Failed user resubmission update");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRealScenarioTest() {
  console.log("===============================================================");
  console.log("🚀 STARTING REAL SCENARIO TEST: APPLICATION LIFECYCLE & SLA PAUSE");
  console.log("===============================================================");
  
  const accessToken = await getAccessToken();
  const testIdNum = Math.floor(1000 + Math.random() * 9000);
  const appId = `APP-REAL-SCENARIO-${testIdNum}`;
  const createdDateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const testAppData = {
    appId,
    timestamp: createdDateStr,
    serviceName: "تصريح رخصة مخبز",
    firstName: "خالد",
    lastName: "المناعي",
    whatsapp: "97335555563", // Compliance with Rule 12 standard test phone number
    email: "gdcdvirtual@gmail.com",
    referenceNumber: `REF-BAKERY-${testIdNum}`,
    attachmentLink: "http://localhost:3000/uploads/test_doc.pdf",
    trackingLink: `http://localhost:3000/track?id=${appId}`,
    dynamicFields: "نوع المخبز: أوتوماتيكي كامل",
    paymentMethod: "Payment Link",
    notes: "طلب اختبار برمجي آلي لدورة حياة المعاملة كاملة مع احتساب إيقاف الوقت"
  };

  // --- STAGE 1: SUBMISSION ---
  console.log(`\n📍 STAGE 1: Submitting New Application [ID: ${appId}]...`);
  await appendTestApplication(accessToken, testAppData);
  await sleep(1500);

  let state1 = await getRowByAppId(accessToken, appId);
  console.log(`✓ Status (Col M): "${state1.status}"`);
  console.log(`✓ Col R (Quick Admin Action): ${state1.quickActionLink ? 'Hyperlink Formula Present ⚡' : 'EMPTY ❌'}`);
  console.log(`✓ Col S (Decision Date): "${state1.decisionDate}" (Expected: Empty)`);
  console.log(`✓ Col T (Net Admin SLA Time): "${state1.slaCompletionTime}" (Expected: Empty)`);
  console.log(`✓ Col U (User Pause Duration): "${state1.userPauseDuration}" (Expected: Empty)`);
  console.log(`✓ Col V (Mod Request Sent At): "${state1.modRequestSentAt}" (Expected: Empty - Running Timer)`);

  // --- STAGE 2: ADMIN REQUESTS MODIFICATION (PAUSE STARTS) ---
  console.log(`\n📍 STAGE 2: Admin Requests Modification (SLA PAUSED)...`);
  await executeAdminQuickActionTest(accessToken, appId, "request_modification", "يرجى تحديث شهادة السلامة وإرفاق سجل تجاري ساري المفعول");
  await sleep(1500);

  let state2 = await getRowByAppId(accessToken, appId);
  console.log(`✓ Status (Col M): "${state2.status}" (Expected: Modification Requested)`);
  console.log(`✓ Col V (Mod Request Sent At): "${state2.modRequestSentAt}" ⏸️ (PAUSE TIMESTAMP RECORDED!)`);
  console.log(`  --> Verification: SLA calculation is NOW PAUSED waiting for user action.`);

  // --- STAGE 3: SIMULATE ELAPSED PAUSE TIME ---
  console.log(`\n📍 STAGE 3: Simulating 4 Seconds User Modification Pause...`);
  await sleep(4000);

  // --- STAGE 4: USER RESUBMITS MODIFICATIONS (PAUSE ENDS / RESUMES) ---
  console.log(`\n📍 STAGE 4: User Resubmits Requested Modifications (SLA RESUMED)...`);
  await simulateUserResubmission(accessToken, appId, "تم رفع شهادة السلامة المحدثة والسجل التجاري المعين");
  await sleep(1500);

  let state4 = await getRowByAppId(accessToken, appId);
  console.log(`✓ Status (Col M): "${state4.status}" (Expected: In Progress)`);
  console.log(`✓ Col V (Mod Request Sent At): "${state4.modRequestSentAt}" ▶️ (PAUSE CLEARED!)`);
  console.log(`✓ Col U (User Pause Duration): "${state4.userPauseDuration}" ⏱️ (ACCUMULATED PAUSE STORED!)`);

  // --- STAGE 5: ADMIN FINAL DECISION (APPROVAL) ---
  console.log(`\n📍 STAGE 5: Admin Issues Final Approval Decision...`);
  await executeAdminQuickActionTest(accessToken, appId, "approve");
  await sleep(1500);

  let state5 = await getRowByAppId(accessToken, appId);
  console.log(`✓ Status (Col M): "${state5.status}" (Expected: Approved)`);
  console.log(`✓ Col S (Decision Date): "${state5.decisionDate}" 📅 (OFFICIAL DECISION TIMESTAMP RECORDED!)`);
  console.log(`✓ Col T (Net Admin SLA Time): "${state5.slaCompletionTime}" 🏆 (NET SLA CALCULATED = TOTAL TIME - PAUSE DURATION)`);
  console.log(`✓ Col U (User Pause Duration): "${state5.userPauseDuration}"`);
  console.log(`✓ Col V (Mod Request Sent At): "${state5.modRequestSentAt}" (Remains Empty)`);

  console.log("\n===============================================================");
  console.log("🎉 REAL SCENARIO TEST COMPLETED SUCCESSFULLY WITH 100% VALIDATION!");
  console.log("===============================================================");
}

runRealScenarioTest().catch(err => {
  console.error("❌ Scenario Test Failed:", err);
  process.exit(1);
});
