// src/utils/url_utils.js - URL & Domain Formatting Utilities

function getSanitizedPublicUrl(req) {
  const envUrl = process.env.APP_URL || process.env.BASE_URL || process.env.PUBLIC_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim();
    if (!clean.includes('localhost') && !clean.includes('127.0.0.1')) {
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      return clean.replace(/\/+$/, '').replace(/^http:\/\//, 'https://');
    }
  }

  let host = req && req.headers ? (req.headers.host || '') : '';
  host = host.replace(/^(https?:\/\/)+/i, '').replace(/^\/+/, '');

  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    let proto = 'https';
    if (req && req.headers && req.headers['x-forwarded-proto']) {
      proto = req.headers['x-forwarded-proto'].split(',')[0].trim();
    }
    if (host.includes('bhcdai.com') || host.includes('2.28.126.154')) {
      proto = 'https';
    }
    let domain = `${proto}://${host}`;
    if (domain.includes('http://https') || domain.includes('https://https')) {
      domain = 'https://' + domain.replace(/^https?:\/*(https?:\/*)?/i, '');
    }
    return domain.replace(/\/+$/, '');
  }

  return 'https://bhcdai.com';
}

function sanitizeTrackingLink(rawUrl, appId) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim() || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
    return `https://bhcdai.com/track?id=${appId || 'APP-UNKNOWN'}`;
  }
  let clean = rawUrl.trim();
  if (clean.includes('http://https') || clean.includes('https://https') || clean.includes('///')) {
    clean = clean.replace(/^(https?:\/*)+/i, 'https://');
    clean = clean.replace('https:///', 'https://');
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean.replace(/^\/+/, '');
  }
  return clean;
}

function formatHyperlinkCell(url, label) {
  if (!url) return '';
  const sanitizedUrl = url.replace(/"/g, '""');
  const sanitizedLabel = (label || 'View Document').replace(/"/g, '""');
  return `=HYPERLINK("${sanitizedUrl}", "${sanitizedLabel}")`;
}

function extractUrlFromHyperlink(cellVal) {
  if (!cellVal) return '';
  const match = String(cellVal).match(/=HYPERLINK\("([^"]+)"/i);
  return match ? match[1] : String(cellVal);
}

module.exports = {
  getSanitizedPublicUrl,
  sanitizeTrackingLink,
  formatHyperlinkCell,
  extractUrlFromHyperlink
};
