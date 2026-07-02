const crypto = require('crypto');

// Generate JWT token for Google Auth
function generateGoogleAccessToken(clientEmail, privateKey, scopes) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedClaimSet = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
  const payload = `${encodedHeader}.${encodedClaimSet}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(payload);
  const signature = sign.sign(privateKey, 'base64url');

  return `${payload}.${signature}`;
}

async function testConnection() {
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

  console.log("Generating Google Auth token...");
  const jwt = generateGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });

    if (!tokenRes.ok) {
      console.error("Authentication failed:", await tokenRes.text());
      return;
    }

    const { access_token } = await tokenRes.json();
    console.log("Authentication successful! OAuth2 token obtained. 🎉");

    console.log(`Fetching rows from spreadsheet ${spreadsheetId}...`);
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:H100`, {
      headers: { "Authorization": `Bearer ${access_token}` }
    });

    if (!getRes.ok) {
      console.error("Failed to fetch sheet content:", await getRes.text());
      return;
    }

    const data = await getRes.json();
    const rows = data.values || [];
    console.log(`Successfully fetched sheet content! Total rows found: ${rows.length}`);
    if (rows.length > 0) {
      console.log("Headers:", rows[0]);
    }
    if (rows.length > 1) {
      console.log("First record:", rows[1]);
    }
  } catch (err) {
    console.error("Error during connection test:", err);
  }
}

testConnection();
