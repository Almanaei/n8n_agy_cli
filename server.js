const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const crypto = require('crypto');

process.on('uncaughtException', (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.stack || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise, "reason:", reason);
});


const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";

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

const server = http.createServer(async (req, res) => {
  if (req.url === '/get-signed-url') {
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
    req.on('end', async () => {
      try {
        const feedbackData = JSON.parse(body);
        console.log("Received feedback payload:", feedbackData);
        
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
          throw new Error(`n8n webhook returned ${n8nRes.status}: ${errText}`);
        }
        
        // Format Google Sheets KPI cell programmatically
        try {
          const conversationId = feedbackData.conversationId;
          const kpiValue = feedbackData.kpi;
          if (conversationId && (kpiValue === '100%' || kpiValue === '50%' || kpiValue === '0%')) {
            console.log(`[Google Sheets Formatter] Triggering programmatic format for ${conversationId} to ${kpiValue}...`);
            await formatKpiCell(conversationId, kpiValue);
          }
        } catch (formatError) {
          console.error("[Google Sheets Formatter] Error during cell formatting:", formatError);
        }

        // Write feedback comment to Google Sheets programmatically
        try {
          const conversationId = feedbackData.conversationId;
          const commentText = feedbackData.comment;
          if (conversationId && commentText !== undefined) {
            console.log(`[Google Sheets Commenter] Writing comment for ${conversationId}: "${commentText}"...`);
            await writeFeedbackComment(conversationId, commentText);
          }
        } catch (commentError) {
          console.error("[Google Sheets Commenter] Error writing feedback comment:", commentError);
        }

        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (error) {
        console.error("Error forwarding feedback to n8n:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
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

      const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:H1000`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      
      if (!getRes.ok) {
        throw new Error(`Failed to get values from sheet: ${getRes.status} ${await getRes.text()}`);
      }
      
      const getData = await getRes.json();
      const rows = getData.values || [];
      
      let totalCalls = 0;
      let excellentCalls = 0; // 100%
      let acceptableCalls = 0; // 50%
      let poorCalls = 0; // 0%
      let notRated = 0;
      
      const parsedRows = [];
      const trendDataMap = {};
      const agentMap = {
        "Standalone Agent": { total: 0, excellent: 0, acceptable: 0, poor: 0 },
        "ElevenLabs Agent": { total: 0, excellent: 0, acceptable: 0, poor: 0 }
      };

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const timestamp = row[0] || "";
        const clientName = row[1] || "مجهول";
        const phoneNumber = row[2] || "";
        const clientEmail = row[3] || "";
        const conversationId = row[4] || "";
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
        
        const agent = (conversationId && conversationId.startsWith("standalone_")) ? "Standalone Agent" : "ElevenLabs Agent";
        agentMap[agent].total++;
        if (kpiVal === 100) agentMap[agent].excellent++;
        else if (kpiVal === 50) agentMap[agent].acceptable++;
        else if (kpiVal === 0) agentMap[agent].poor++;

        parsedRows.push({
          timestamp,
          clientName,
          phoneNumber,
          clientEmail,
          conversationId,
          status,
          kpi,
          comment
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
        recentCalls: parsedRows.slice(-30).reverse()
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
  } else if (req.url === '/dashboard' || req.url === '/dashboard.html') {
    fs.readFile(path.join(__dirname, 'dashboard.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading dashboard.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  } else if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  } else if (req.url === '/standalone' || req.url === '/standalone.html' || req.url === '/index_standalone.html') {
    fs.readFile(path.join(__dirname, 'index_standalone.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index_standalone.html');
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

// Set up WebSocket server for proxying
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  if (pathname === '/stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      // Connect to the Python FastAPI backend on port 8000
      const targetWs = new WebSocket('ws://localhost:8000/stream');

      ws.on('message', (message, isBinary) => {
        if (targetWs.readyState === WebSocket.OPEN) {
          if (isBinary) {
            targetWs.send(message);
          } else {
            targetWs.send(message.toString('utf8'));
          }
        }
      });

      targetWs.on('message', (data, isBinary) => {
        if (ws.readyState === WebSocket.OPEN) {
          if (isBinary) {
            ws.send(data);
          } else {
            ws.send(data.toString('utf8'));
          }
        }
      });

      ws.on('close', () => {
        try {
          if (targetWs.readyState === WebSocket.OPEN || targetWs.readyState === WebSocket.CONNECTING) {
            targetWs.close();
          }
        } catch (e) {
          console.error("Error closing target WS:", e);
        }
      });
      targetWs.on('close', () => {
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        } catch (e) {
          console.error("Error closing client WS:", e);
        }
      });
      
      ws.on('error', (err) => console.error("Client WS proxy error:", err));
      targetWs.on('error', (err) => console.error("Target WS proxy error:", err));
    });
  } else {
    socket.destroy();
  }
});

server.listen(3000, () => {
  console.log('Test server running at http://localhost:3000');
});
