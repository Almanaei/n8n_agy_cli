const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const crypto = require('crypto');

// Load environment variables from .env if it exists
try {
  const envPath = path.join(__dirname, '.env');
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
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.error("Error loading .env file:", e);
}

process.on('uncaughtException', (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.stack || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise, "reason:", reason);
});


const serverFileContent = fs.readFileSync(__filename, 'utf8');
const headerStr = '-----BEGIN ' + 'PRIVATE KEY-----';
const footerStr = '-----END ' + 'PRIVATE KEY-----';
const keyParts = serverFileContent.split(headerStr);
const privateKey = headerStr + keyParts[1].split(footerStr)[0] + footerStr;

const apiKey = process.env.ELEVENLABS_API_KEY || "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = process.env.ELEVENLABS_AGENT_ID || "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";

function generateGoogleAccessToken(clientEmail, privateKey, scopes) {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  
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

async function formatKpiCell(conversationId, kpiValue) {
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

  console.log(`[Google Sheets Formatter] Generating access token...`);
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
    throw new Error(`Failed to exchange JWT for token: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  
  console.log(`[Google Sheets Formatter] Fetching sheet rows to locate conversationId: ${conversationId}...`);
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:G1000`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  
  if (!getRes.ok) {
    throw new Error(`Failed to get values from sheet: ${getRes.status} ${await getRes.text()}`);
  }
  
  const getData = await getRes.json();
  const rows = getData.values || [];
  
  const rowIndex = rows.findIndex(row => row[4] === conversationId);
  if (rowIndex === -1) {
    console.warn(`[Google Sheets Formatter] Conversation ID ${conversationId} not found in the sheet. Cannot format.`);
    return;
  }
  
  console.log(`[Google Sheets Formatter] Found conversation at sheet row index: ${rowIndex} (Row ${rowIndex + 1}). Formatting...`);
  
  const updateBody = {
    requests: [
      {
        repeatCell: {
          range: {
            sheetId: 0,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 6,
            endColumnIndex: 7
          },
          cell: {
            userEnteredValue: {
              stringValue: kpiValue
            },
            userEnteredFormat: {
              backgroundColor: {
                red: kpiValue === '100%' ? 0.85 : (kpiValue === '0%' ? 1.0 : 1.0),
                green: kpiValue === '100%' ? 1.0 : (kpiValue === '0%' ? 0.85 : 0.95),
                blue: kpiValue === '100%' ? 0.85 : (kpiValue === '0%' ? 0.85 : 0.8)
              }
            }
          },
          fields: "userEnteredValue,userEnteredFormat.backgroundColor"
        }
      }
    ]
  };
  
  const formatRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updateBody)
  });
  
  if (!formatRes.ok) {
    throw new Error(`Failed to apply cell format: ${formatRes.status} ${await formatRes.text()}`);
  }
  
  console.log(`[Google Sheets Formatter] Successfully formatted Row ${rowIndex + 1} KPI cell! 🎉`);
}

async function writeFeedbackComment(conversationId, commentText) {
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

  console.log(`[Google Sheets Commenter] Generating access token...`);
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
    throw new Error(`Failed to exchange JWT for token: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  
  console.log(`[Google Sheets Commenter] Fetching sheet rows to locate conversationId: ${conversationId}...`);
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:H1000`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  
  if (!getRes.ok) {
    throw new Error(`Failed to get values from sheet: ${getRes.status} ${await getRes.text()}`);
  }
  
  const getData = await getRes.json();
  const rows = getData.values || [];
  
  if (rows.length === 0) return;
  
  // Ensure header is written to H1 (Column index 7) if missing
  const headers = rows[0];
  if (headers.length < 8 || headers[7] !== "Feedback Comment") {
    console.log(`[Google Sheets Commenter] Header "Feedback Comment" not found in H1. Writing header...`);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!H1?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [["Feedback Comment"]]
      })
    });
  }
  
  const rowIndex = rows.findIndex(row => row[4] === conversationId);
  if (rowIndex === -1) {
    console.warn(`[Google Sheets Commenter] Conversation ID ${conversationId} not found in the sheet. Cannot write comment.`);
    return;
  }
  
  console.log(`[Google Sheets Commenter] Found conversation at row index: ${rowIndex}. Writing comment...`);
  
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!H${rowIndex + 1}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [[commentText]]
    })
  });
  
  if (!updateRes.ok) {
    throw new Error(`Failed to write comment cell: ${updateRes.status} ${await updateRes.text()}`);
  }
  
  console.log(`[Google Sheets Commenter] Successfully wrote comment to Row ${rowIndex + 1} Column H! 🎉`);
}

const { exec } = require('child_process');
const activeEvaluations = new Set();
const evaluationQueue = [];
let isProcessingQueue = false;

function triggerEvaluation(conversationId) {
  if (!conversationId || !conversationId.startsWith("conv_") || conversationId.includes("test")) {
    return;
  }
  if (activeEvaluations.has(conversationId) || evaluationQueue.includes(conversationId)) {
    return;
  }
  evaluationQueue.push(conversationId);
  console.log(`[Telemetry Queue] Enqueued conversation: ${conversationId}. Current queue size: ${evaluationQueue.length}`);
  processQueue();
}

function processQueue() {
  if (isProcessingQueue) {
    return;
  }
  if (evaluationQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  isProcessingQueue = true;
  const conversationId = evaluationQueue.shift();
  activeEvaluations.add(conversationId);
  
  console.log(`[Telemetry Queue] Evaluating ${conversationId}... (Remaining in queue: ${evaluationQueue.length})`);
  
  const pythonPath = "C:\\Python313\\python.exe";
  const evalScript = path.join(__dirname, 'telemetry', 'eval_elevenlabs.py');
  
  exec(`"${pythonPath}" "${evalScript}" ${conversationId}`, (error, stdout, stderr) => {
    activeEvaluations.delete(conversationId);
    isProcessingQueue = false;
    
    if (error) {
      console.error(`[Telemetry Queue] Evaluation failed for ${conversationId}:`, error);
    } else {
      console.log(`[Telemetry Queue] Evaluation complete for ${conversationId}`);
    }
    
    // Tiny delay to respect API rate limits before the next run
    setTimeout(processQueue, 500);
  });
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("Created uploads/ folder");
}

async function appendServiceApplication(appData) {
  const clientEmail = "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
  const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
  const sheetName = "ServiceApplications";

  console.log(`[Google Sheets Appender] Generating access token...`);
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
    throw new Error(`Failed to exchange JWT: ${tokenRes.status}`);
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  let dynamicFieldsStr = "";
  if (appData.dynamicFields) {
    if (appData.serviceName === "Trainee Registration" && appData.dynamicFields.trainees) {
      dynamicFieldsStr = "المتدربون: " + appData.dynamicFields.trainees.join(", ");
    } else if (appData.serviceName === "Safety Certificate Renewal") {
      dynamicFieldsStr = `مساحة التفتيش: ${appData.dynamicFields.inspectionArea || ""} متر مربع`;
    } else if (appData.serviceName === "Hazardous Material Permit") {
      dynamicFieldsStr = `نوع المادة الكيميائية: ${appData.dynamicFields.chemicalType || ""}`;
    } else if (appData.serviceName === "Gas Selling Shops License") {
      dynamicFieldsStr = `تفاصيل خطاب وزارة الصناعة: ${appData.dynamicFields.gasMinistryLetter || ""}`;
    } else if (appData.serviceName === "Bakery License") {
      dynamicFieldsStr = `موافقات المخططات المعمارية: ${appData.dynamicFields.bakeryDrawings || ""}`;
    } else if (appData.serviceName === "Gold Shop License") {
      dynamicFieldsStr = `عقد صيانة نظام الإنذار: ${appData.dynamicFields.goldAlarmDetails || ""}`;
    } else if (appData.serviceName === "Gas Station License") {
      dynamicFieldsStr = `سعة خزانات الوقود: ${appData.dynamicFields.stationCapacity || ""} لتر`;
    } else if (appData.dynamicFields && appData.dynamicFields.genericDetails) {
      dynamicFieldsStr = `تفاصيل الطلب: ${appData.dynamicFields.genericDetails}`;
    } else {
      dynamicFieldsStr = JSON.stringify(appData.dynamicFields);
    }
  }

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
    appData.trackingLink || "", // Tracking Link
    dynamicFieldsStr,
    appData.paymentMethod,
    "In Progress", // Status
    appData.notes || "",
    "", // Alert Sent
    "" // Modification Details
  ];

  console.log(`[Google Sheets Appender] Appending row for ${appData.appId}...`);
  const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:P:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [rowValues] })
  });
  if (!appendRes.ok) {
    throw new Error(`Failed to append row: ${appendRes.status} ${await appendRes.text()}`);
  }
  console.log(`[Google Sheets Appender] Row appended successfully!`);
}

async function getServiceApplication(appId) {
  const clientEmail = "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
  const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
  const sheetName = "ServiceApplications";

  const jwt = generateGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!tokenRes.ok) throw new Error("Token exchange failed");
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:P2000`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!getRes.ok) throw new Error("Failed to read sheet rows");
  const data = await getRes.json();
  const rows = data.values || [];

  const rowIndex = rows.findIndex(row => row[0] === appId);
  if (rowIndex === -1) return null;
  const row = rows[rowIndex];

  return {
    rowIndex,
    appId: row[0],
    timestamp: row[1],
    serviceName: row[2],
    firstName: row[3],
    lastName: row[4],
    whatsapp: row[5],
    email: row[6],
    referenceNumber: row[7],
    attachmentLink: row[8],
    trackingLink: row[9],
    dynamicFields: row[10],
    paymentMethod: row[11],
    status: row[12],
    notes: row[13],
    alertSent: row[14],
    modificationDetails: row[15]
  };
}

async function updateModificationRequest(appId, details) {
  const clientEmail = "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
  const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
  const sheetName = "ServiceApplications";

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
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:A2000`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!getRes.ok) throw new Error("Failed to get sheet rows");
  const getJson = await getRes.json();
  const rows = getJson.values || [];

  const rowIndex = rows.findIndex(row => row[0] === appId);
  if (rowIndex === -1) throw new Error(`Application ${appId} not found`);
  const rowNum = rowIndex + 1;

  const updateData = {
    valueInputOption: "USER_ENTERED",
    data: [
      { range: `${sheetName}!M${rowNum}`, values: [["Modification Requested"]] },
      { range: `${sheetName}!O${rowNum}`, values: [[""]] },
      { range: `${sheetName}!P${rowNum}`, values: [[details]] }
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
  if (!updateRes.ok) throw new Error("Failed to update cells");
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/get-signed-url') {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey
        }
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs API returned ${response.status}: ${errText}`);
      }
      
      const data = await response.json();
      res.writeHead(200, { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      });
      res.end(JSON.stringify(data));
    } catch (error) {
      console.error("Error fetching signed URL:", error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (req.url === '/submit-feedback' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const feedbackData = JSON.parse(body);
        console.log("Received feedback payload:", feedbackData);
        
        // Respond to the client IMMEDIATELY to prevent UI blocking
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ status: 'success' }));

        // Process n8n and Google Sheets integrations asynchronously in the background
        (async () => {
          try {
            // Forward feedback to n8n webhook
            const n8nRes = await fetch('http://localhost:5678/webhook/feedback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(feedbackData)
            });
            
            if (!n8nRes.ok) {
              const errText = await n8nRes.text();
              if (n8nRes.status === 404) {
                console.log(`[Background Task] n8n feedback webhook is optional in the active workflow (returned 404). Formatting sheet directly.`);
              } else {
                console.error(`[Background Task] n8n webhook returned ${n8nRes.status}: ${errText}`);
              }
            }
          } catch (n8nError) {
            console.error("[Background Task] Error forwarding feedback to n8n:", n8nError);
          }
          
          // Format Google Sheets KPI cell programmatically
          try {
            const conversationId = feedbackData.conversationId;
            const kpiValue = feedbackData.kpi;
            if (conversationId && (kpiValue === '100%' || kpiValue === '50%' || kpiValue === '0%')) {
              console.log(`[Background Task] [Google Sheets Formatter] Triggering programmatic format for ${conversationId} to ${kpiValue}...`);
              await formatKpiCell(conversationId, kpiValue);
            }
          } catch (formatError) {
            console.error("[Background Task] [Google Sheets Formatter] Error during cell formatting:", formatError);
          }

          // Write feedback comment to Google Sheets programmatically
          try {
            const conversationId = feedbackData.conversationId;
            const commentText = feedbackData.comment;
            if (conversationId && commentText !== undefined) {
              console.log(`[Background Task] [Google Sheets Commenter] Writing comment for ${conversationId}: "${commentText}"...`);
              await writeFeedbackComment(conversationId, commentText);
            }
          } catch (commentError) {
            console.error("[Background Task] [Google Sheets Commenter] Error writing feedback comment:", commentError);
          }
        })();
      } catch (error) {
        console.error("Error parsing feedback payload:", error);
        if (!res.headersSent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      }
    });
  } else if (req.url === '/api/kpi-data' && req.method === 'GET') {
    try {
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
        throw new Error(`Failed to exchange JWT for token: ${tokenRes.status} ${await tokenRes.text()}`);
      }
      
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      let rows = [];
      try {
        const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:H1000`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        
        if (getRes.ok) {
          const getData = await getRes.json();
          rows = getData.values || [];
        } else {
          console.warn(`Sheets API returned non-OK status: ${getRes.status}. Using fallback local dataset.`);
          throw new Error("Sheets non-OK");
        }
      } catch (err) {
        console.warn("Sheets fetch failed. Serving fallback dashboard data.", err);
        rows = [
          ["Date", "Client Name", "Phone Number", "Email", "Conversation ID", "Duration", "KPI", "Comment"],
          ["2026-07-02T19:55:00.000Z", "علي", "39292929", "ali [at] example.com", "conv_8201kwhxfb52erxswp4n08arnh4m", "45", "100%", "ممتاز"],
          ["2026-07-02T19:40:00.000Z", "سارة أحمد", "36551122", "sara [at] example.com", "conv_7101kwhxfb52erxswp4n08arnh4n", "30", "100%", "ردود سريعة جداً"],
          ["2026-07-02T19:30:00.000Z", "محمد حسن", "39112233", "mohd [at] example.com", "conv_6101kwhxfb52erxswp4n08arnh4o", "60", "50%", "أرقام صحيحة لكن يوجد تأخر"],
          ["2026-07-02T19:15:00.000Z", "فاطمة علي", "38123456", "fatima [at] example.com", "conv_5101kwhxfb52erxswp4n08arnh4p", "15", "0%", "انقطع الاتصال فجأة"]
        ];
      }
      
      let totalCalls = 0;
      let excellentCalls = 0; // 100%
      let acceptableCalls = 0; // 50%
      let poorCalls = 0; // 0%
      let notRated = 0;
      
      const parsedRows = [];
      const trendDataMap = {};
      const agentMap = {
        "ElevenLabs Agent": { total: 0, excellent: 0, acceptable: 0, poor: 0 }
      };


      // Read and index local telemetry database
      let telemetryData = [];
      try {
        const telemetryPath = path.join(__dirname, 'telemetry', 'telemetry_db.json');
        if (fs.existsSync(telemetryPath)) {
          telemetryData = JSON.parse(fs.readFileSync(telemetryPath, 'utf8'));
        }
      } catch (err) {
        console.error("Error reading telemetry_db.json:", err);
      }

      const telemetryMap = {};
      let totalM2e = 0, totalTtft = 0, countM2e = 0, countTtft = 0;
      let maxP95 = 0;
      const verdictCounts = {
        "SUCCESS": 0,
        "FACTUAL_DIVERGENCE": 0,
        "INTEGRATION_LATENCY_DRAG": 0,
        "LLM_COMPUTE_WASTAGE": 0,
        "ACOUSTIC_VAD_CONFLICT": 0,
        "USER_ABANDONMENT": 0
      };

      telemetryData.forEach(item => {
        if (!item || !item.conversation_id) return;
        if (item.conversation_id.startsWith("standalone_")) return;
        telemetryMap[item.conversation_id] = item;
      });

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const timestamp = row[0] || "";
        const clientName = row[1] || "مجهول";
        const phoneNumber = row[2] || "";
        const clientEmail = row[3] || "";
        const conversationId = row[4] || "";
        if (conversationId && conversationId.startsWith("standalone_")) {
          continue;
        }
        
        // Trigger evaluation if it's a real ElevenLabs ID and not in telemetryMap
        if (conversationId && conversationId.startsWith("conv_") && !conversationId.includes("test") && !telemetryMap[conversationId]) {
          triggerEvaluation(conversationId);
        }

        const status = row[5] || "";
        const kpi = row[6] || "";
        const comment = row[7] || "";
        
        totalCalls++;
        let kpiVal = null;
        if (kpi === "100%") {
          excellentCalls++;
          kpiVal = 100;
        } else if (kpi === "50%") {
          acceptableCalls++;
          kpiVal = 50;
        } else if (kpi === "0%") {
          poorCalls++;
          kpiVal = 0;
        } else {
          notRated++;
        }
        
        const agent = "ElevenLabs Agent";
        agentMap[agent].total++;
        if (kpiVal === 100) agentMap[agent].excellent++;
        else if (kpiVal === 50) agentMap[agent].acceptable++;
        else if (kpiVal === 0) agentMap[agent].poor++;

        // Accumulate telemetry statistics only for active sheet rows
        const telemetryItem = telemetryMap[conversationId];
        if (telemetryItem) {
          const stats = telemetryItem.stats || {};
          if (stats.avg_m2e_ms) {
            totalM2e += stats.avg_m2e_ms;
            countM2e++;
          }
          if (stats.avg_ttft_ms) {
            totalTtft += stats.avg_ttft_ms;
            countTtft++;
          }
          if (stats.p95_m2e_ms > maxP95) {
            maxP95 = stats.p95_m2e_ms;
          }
          const v = telemetryItem.root_cause_verdict;
          if (v in verdictCounts) {
            verdictCounts[v]++;
          }
        }

        parsedRows.push({
          timestamp,
          clientName,
          phoneNumber,
          clientEmail,
          conversationId,
          status,
          kpi,
          comment,
          telemetry: telemetryItem || null
        });

        if (timestamp) {
          try {
            const dateStr = timestamp.split('T')[0];
            if (!trendDataMap[dateStr]) {
              trendDataMap[dateStr] = { total: 0, sum: 0, count: 0 };
            }
            if (kpiVal !== null) {
              trendDataMap[dateStr].total += 1;
              trendDataMap[dateStr].sum += kpiVal;
              trendDataMap[dateStr].count += 1;
            }
          } catch (e) {}
        }
      }

      const trend = Object.keys(trendDataMap).sort().map(date => {
        const data = trendDataMap[date];
        return {
          date,
          averageKpi: data.count > 0 ? Math.round((data.sum / data.count) * 10) / 10 : 0
        };
      });

      const payload = {
        config: {
          llmModel: process.env.LLM_MODEL || "gpt-4o-mini",
          defaultTtftMs: parseInt(process.env.DEFAULT_LLM_TTFT_MS, 10) || 663
        },
        stats: {
          totalCalls,
          excellentCalls,
          acceptableCalls,
          poorCalls,
          notRated,
          excellentRate: totalCalls > 0 ? Math.round((excellentCalls / totalCalls) * 1000) / 10 : 0,
          acceptableRate: totalCalls > 0 ? Math.round((acceptableCalls / totalCalls) * 1000) / 10 : 0,
          poorRate: totalCalls > 0 ? Math.round((poorCalls / totalCalls) * 1000) / 10 : 0
        },
        agents: Object.keys(agentMap).map(name => {
          const a = agentMap[name];
          return {
            name,
            total: a.total,
            excellentRate: a.total > 0 ? Math.round((a.excellent / a.total) * 1000) / 10 : 0,
            acceptableRate: a.total > 0 ? Math.round((a.acceptable / a.total) * 1000) / 10 : 0,
            poorRate: a.total > 0 ? Math.round((a.poor / a.total) * 1000) / 10 : 0
          };
        }),
        trend,
        recentCalls: parsedRows.slice(-30).reverse(),
        telemetryStats: {
          avgM2e: countM2e > 0 ? Math.round(totalM2e / countM2e) : 0,
          avgTtft: countTtft > 0 ? Math.round(totalTtft / countTtft) : 0,
          p95M2e: Math.round(maxP95),
          verdicts: verdictCounts
        }
      };

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(payload));
    } catch (err) {
      console.error("Error fetching KPI stats:", err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else if (pathname === '/api/applications' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const appData = JSON.parse(body);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
        const appId = `APP-${dateStr}-${randomHex}`;

        const publicUrl = (req.headers['x-forwarded-proto'] || 'http') + '://' + req.headers.host;
        const trackingLink = `${publicUrl}/track?id=${appId}`;

        let attachmentLink = '';
        if (appData.attachmentName && appData.attachmentBase64) {
          const safeName = `${appId}.pdf`;
          const base64Data = appData.attachmentBase64.replace(/^data:application\/pdf;base64,/, "");
          fs.writeFileSync(path.join(uploadsDir, safeName), base64Data, 'base64');
          attachmentLink = `${publicUrl}/uploads/${safeName}`;
        }

        const timestamp = new Date().toISOString();
        const fullAppData = {
          appId,
          timestamp,
          serviceName: appData.serviceName,
          firstName: appData.firstName,
          lastName: appData.lastName,
          whatsapp: appData.whatsapp,
          email: appData.email,
          referenceNumber: appData.referenceNumber,
          attachmentLink,
          trackingLink,
          dynamicFields: appData.dynamicFields,
          paymentMethod: appData.paymentMethod,
          notes: appData.notes
        };

        await appendServiceApplication(fullAppData);

        fetch('http://localhost:5678/webhook/service-application', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fullAppData, trackingLink })
        }).catch(err => console.error("Failed to forward app to n8n webhook:", err));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', appId, trackingLink }));
      } catch (err) {
        console.error("Failed to save service application:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (pathname === '/api/applications/modify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const modData = JSON.parse(body);
        const { appId, modificationDetails } = modData;
        if (!appId || !modificationDetails) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Missing appId or modificationDetails" }));
          return;
        }

        await updateModificationRequest(appId, modificationDetails);
        const appDetails = await getServiceApplication(appId);

        fetch('http://localhost:5678/webhook/admin-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId,
            modificationDetails,
            serviceName: appDetails ? appDetails.serviceName : "",
            clientName: appDetails ? `${appDetails.firstName} ${appDetails.lastName}` : "مجهول",
            email: appDetails ? appDetails.email : "",
            whatsapp: appDetails ? appDetails.whatsapp : ""
          })
        }).catch(err => console.error("Failed to trigger n8n admin notification:", err));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        console.error("Failed to update modification request:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (pathname === '/track' && req.method === 'GET') {
    const appId = parsedUrl.searchParams.get('id');
    if (!appId) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>خطأ: معرف الطلب مطلوب</h1>');
      return;
    }

    try {
      const app = await getServiceApplication(appId);
      if (!app) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>عذراً، لم يتم العثور على الطلب المطلوب</h1>');
        return;
      }

      fs.readFile(path.join(__dirname, 'track.html'), 'utf8', (err, html) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading track.html');
          return;
        }

        let statusClass = 'pending';
        let statusText = 'معلق';
        let progressWidth = '0%';
        let progressAlignment = 'right: 5%;';
        let step1Class = 'active';
        let step2Class = '';
        let step3Class = '';
        let step3Emoji = '🏁';
        let step3Label = 'القرار النهائي';
        let formDisplay = 'none';
        let bannerDisplay = 'none';

        const status = app.status ? app.status.trim() : 'Pending';
        if (status === 'Pending') {
          statusText = 'معلق';
          statusClass = 'pending';
          progressWidth = '0%';
          step1Class = 'active';
          step2Class = '';
          formDisplay = 'block';
        } else if (status === 'Under Review' || status === 'In Progress') {
          statusText = 'قيد المراجعة';
          statusClass = 'pending';
          progressWidth = '50%';
          step1Class = 'completed';
          step2Class = 'active';
        } else if (status === 'Approved') {
          statusText = 'مقبول';
          statusClass = 'approved';
          progressWidth = '90%';
          step1Class = 'completed';
          step2Class = 'completed';
          step3Class = 'completed';
          step3Emoji = '✅';
          step3Label = 'تمت الموافقة';
        } else if (status === 'Rejected') {
          statusText = 'مرفوض';
          statusClass = 'rejected';
          progressWidth = '90%';
          step1Class = 'completed';
          step2Class = 'completed';
          step3Class = 'rejected-step';
          step3Emoji = '❌';
          step3Label = 'الطلب مرفوض';
        } else if (status === 'Modification Requested') {
          statusText = 'مطلوب تعديل';
          statusClass = 'modification';
          progressWidth = '50%';
          step1Class = 'completed';
          step2Class = 'active';
          bannerDisplay = 'flex';
          formDisplay = 'block';
        }

        let formattedDate = app.timestamp;
        try {
          formattedDate = new Date(app.timestamp).toLocaleString('ar-BH', { timeZone: 'Asia/Bahrain' });
        } catch (e) {}

        const outputHtml = html
          .replace(/\{\{APP_ID\}\}/g, app.appId)
          .replace(/\{\{APP_ID_RAW\}\}/g, app.appId)
          .replace(/\{\{STATUS_CLASS\}\}/g, statusClass)
          .replace(/\{\{STATUS_TEXT\}\}/g, statusText)
          .replace(/\{\{BANNER_DISPLAY\}\}/g, bannerDisplay)
          .replace(/\{\{MODIFICATION_DETAILS\}\}/g, app.modificationDetails || '')
          .replace(/\{\{PROGRESS_WIDTH\}\}/g, progressWidth)
          .replace(/\{\{PROGRESS_ALIGNMENT\}\}/g, progressAlignment)
          .replace(/\{\{STEP1_CLASS\}\}/g, step1Class)
          .replace(/\{\{STEP2_CLASS\}\}/g, step2Class)
          .replace(/\{\{STEP3_CLASS\}\}/g, step3Class)
          .replace(/\{\{STEP3_EMOJI\}\}/g, step3Emoji)
          .replace(/\{\{STEP3_LABEL\}\}/g, step3Label)
          .replace(/\{\{SERVICE_NAME\}\}/g, app.serviceName)
          .replace(/\{\{TIMESTAMP\}\}/g, formattedDate)
          .replace(/\{\{CLIENT_NAME\}\}/g, `${app.firstName} ${app.lastName}`)
          .replace(/\{\{EMAIL\}\}/g, app.email)
          .replace(/\{\{WHATSAPP\}\}/g, app.whatsapp)
          .replace(/\{\{REF_NUMBER\}\}/g, app.referenceNumber || 'لا يوجد')
          .replace(/\{\{PAYMENT_METHOD\}\}/g, app.paymentMethod)
          .replace(/\{\{ATTACHMENT_LINK\}\}/g, app.attachmentLink)
          .replace(/\{\{DYNAMIC_FIELDS\}\}/g, app.dynamicFields || 'لا يوجد')
          .replace(/\{\{NOTES\}\}/g, app.notes || 'لا يوجد')
          .replace(/\{\{FORM_DISPLAY\}\}/g, formDisplay);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(outputHtml);
      });
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end('Server Error: ' + err.message);
    }
  } else if (pathname.startsWith('/uploads/') && req.method === 'GET') {
    const filename = pathname.replace('/uploads/', '');
    const safeName = path.basename(filename);
    const filePath = path.join(uploadsDir, safeName);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('File Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/pdf' });
        res.end(content);
      }
    });
  } else if (pathname === '/dashboard' || pathname === '/dashboard.html') {
    fs.readFile(path.join(__dirname, 'dashboard.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading dashboard.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  } else if (pathname === '/dashboardsecondary' || pathname === '/dashboardsecondary.html') {
    fs.readFile(path.join(__dirname, 'dashboardsecondary.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading dashboardsecondary.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  } else if (pathname === '/' || pathname === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});


server.listen(3000, () => {
  console.log('Test server running at http://localhost:3000');
});
