// src/services/google_sheets_client.js - Token-Cached Google Sheets OAuth2 API Client
const crypto = require('crypto');

// In-memory cache for Google OAuth2 access tokens
// Key: clientEmail:scopes.join(',') -> { token: string, expiresAt: number }
const tokenCache = new Map();

/**
 * Generates an RS256 JWT assertion for Google Service Account authentication
 */
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

/**
 * Retrieves a cached Google OAuth2 access token or exchanges a new JWT assertion.
 * Caches tokens for 55 minutes (with a 5-minute safety buffer before expiry).
 */
async function getCachedGoogleAccessToken(clientEmail, privateKey, scopes = ["https://www.googleapis.com/auth/spreadsheets"]) {
  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Client Email or Private Key credentials.");
  }

  const cacheKey = `${clientEmail}:${scopes.slice().sort().join(',')}`;
  const nowMs = Date.now();
  const cached = tokenCache.get(cacheKey);

  // Return cached token if valid for at least 5 more minutes (300,000 ms)
  if (cached && cached.expiresAt > nowMs + 300000) {
    return cached.token;
  }

  const jwt = generateGoogleAccessToken(clientEmail, privateKey, scopes);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth2 token exchange failed: ${tokenRes.status} ${errText}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const expiresInSec = tokenData.expires_in || 3600;

  // Cache token with expiration time
  tokenCache.set(cacheKey, {
    token: accessToken,
    expiresAt: nowMs + (expiresInSec * 1000)
  });

  return accessToken;
}

/**
 * Clears the token cache (useful for testing or on auth errors)
 */
function clearTokenCache() {
  tokenCache.clear();
}

module.exports = {
  generateGoogleAccessToken,
  getCachedGoogleAccessToken,
  clearTokenCache
};
