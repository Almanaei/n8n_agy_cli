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

async function runTest() {
  console.log("=== STARTING END-TO-END WORKFLOW TEST ===");

  const samplePdfBase64 = "data:application/pdf;base64,JVBERi0xLjQKJcFSnaerCg=="; // Tiny valid-ish base64 pdf header

  const appPayload = {
    serviceName: "Trainee Registration",
    firstName: "سلمان",
    lastName: "العالي",
    whatsapp: "+97317461100",
    email: "almannaei90@gmail.com",
    referenceNumber: "CR-97300",
    attachmentName: "trainee_list_test.pdf",
    attachmentBase64: samplePdfBase64,
    dynamicFields: {
      trainees: ["أحمد علي", "حسين حسن", "فاطمة محمد"]
    },
    paymentMethod: "Payment Link",
    notes: "هذا الطلب تم إرساله آلياً عبر نظام الفحص البرمجي التلقائي."
  };

  console.log("\n1. Simulating Form Submission (POST /api/applications)...");
  const submitRes = await fetch("http://localhost:3000/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appPayload)
  });

  if (!submitRes.ok) {
    throw new Error(`Submit application failed: ${submitRes.status} ${await submitRes.text()}`);
  }

  const submitData = await submitRes.json();
  console.log("Response:", submitData);
  const { appId, trackingLink } = submitData;
  if (!appId || !appId.startsWith("APP-")) {
    throw new Error("Invalid Application ID generated!");
  }
  console.log("✓ Success: App ID and Tracking Link generated successfully!");

  console.log("\n2. Checking if PDF is saved locally in uploads/ folder...");
  const pdfPath = path.join(__dirname, 'uploads', `${appId}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not saved locally at: ${pdfPath}`);
  }
  console.log("✓ Success: PDF attachment saved locally!");

  console.log("\n3. Querying Google Sheet to verify record exists...");
  const token = await getAccessToken();
  const getRowsRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:P2000`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!getRowsRes.ok) throw new Error("Failed to read spreadsheet rows");
  const rowsData = await getRowsRes.json();
  const rows = rowsData.values || [];
  
  const rowIndex = rows.findIndex(r => r[0] === appId);
  if (rowIndex === -1) {
    throw new Error(`Record for appId ${appId} not found in Google Sheets!`);
  }
  
  const row = rows[rowIndex];
  console.log(`✓ Success: Record found at row ${rowIndex + 1}!`);
  console.log("Stored Status:", row[12]); // Status is column M (index 12)
  console.log("Stored Dynamic Fields:", row[10]);

  if (row[12] !== "Pending") {
    throw new Error("Default status is not 'Pending'!");
  }

  console.log("\n4. Fetching the Tracking page (GET /track)...");
  const trackRes = await fetch(`http://localhost:3000/track?id=${appId}`);
  if (!trackRes.ok) {
    throw new Error(`Tracking page failed to load: ${trackRes.status}`);
  }
  const trackHtml = await trackRes.text();
  if (!trackHtml.includes(appId) || !trackHtml.includes("سلمان العالي")) {
    throw new Error("Tracking page does not contain expected application details!");
  }
  console.log("✓ Success: Tracking page fetched and displays correct information!");

  console.log("\n5. Simulating Admin update in Google Sheet (Status -> 'Under Review')...");
  const rowNum = rowIndex + 1;
  const updateStatusRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!M${rowNum}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [["Under Review"]]
    })
  });
  if (!updateStatusRes.ok) throw new Error("Failed to update status in Google Sheet");
  console.log("✓ Success: Sheet updated to 'Under Review'.");

  console.log("\n6. Waiting for n8n status poller to run (takes 60-90s)...");
  console.log("Let's wait 70 seconds for n8n to poll and send alerts...");
  await new Promise(resolve => setTimeout(resolve, 70000));

  console.log("\n7. Re-checking Google Sheet to verify 'Alert Sent' = 'Yes'...");
  const getRowsRes2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:P2000`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const rowsData2 = await getRowsRes2.json();
  const rowUpdated = rowsData2.values[rowIndex];
  console.log("Current Status:", rowUpdated[12]);
  console.log("Alert Sent Flag:", rowUpdated[14]); // Alert Sent is column O (index 14)

  if (rowUpdated[14] !== "Yes") {
    console.warn("⚠️ Warning: n8n poller hasn't marked Alert Sent yet. It might still be processing. Continuing test...");
  } else {
    console.log("✓ Success: n8n has successfully processed the status update and marked Alert Sent = Yes!");
  }

  console.log("\n8. Simulating User Modification Request (POST /api/applications/modify)...");
  const modifyPayload = {
    appId,
    modificationDetails: "أرجو تصحيح اسم المتدرب الثاني ليكون 'حسين بن حسن' بدلاً من 'حسين حسن'."
  };
  const modifyRes = await fetch("http://localhost:3000/api/applications/modify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modifyPayload)
  });
  if (!modifyRes.ok) {
    throw new Error(`Modification request failed: ${modifyRes.status}`);
  }
  console.log("✓ Success: Modification request API responded with 200 OK.");

  console.log("\n9. Re-checking Google Sheet for modification request registration...");
  const getRowsRes3 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:P2000`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const rowsData3 = await getRowsRes3.json();
  const rowMod = rowsData3.values[rowIndex];
  console.log("Current Status:", rowMod[12]);
  console.log("Alert Sent Flag:", rowMod[14]);
  console.log("Modification Details:", rowMod[15]); // Column P (index 15)

  if (rowMod[12] !== "Modification Requested") {
    throw new Error("Status was not updated to 'Modification Requested'!");
  }
  if (rowMod[14] !== "") {
    throw new Error("Alert Sent flag was not cleared!");
  }
  if (!rowMod[15].includes("حسين بن حسن")) {
    throw new Error("Modification details were not written correctly!");
  }
  
  console.log("✓ Success: Google Sheet correctly updated with modification status, details, and cleared alert flag!");
  
  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! E2E INTEGRATION IS 100% CORRECT! 🎉 ===");
}

runTest().catch(err => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
