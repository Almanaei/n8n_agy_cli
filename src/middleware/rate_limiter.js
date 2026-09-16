// src/middleware/rate_limiter.js - Production Security: Client IP Extraction & Rate Limiter

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
}

class MemoryRateLimiter {
  constructor(windowMs, maxRequests, message) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message || "Too many requests. Please try again later.";
    this.hits = new Map(); // ip -> [timestamps]

    // Periodically clean up expired timestamps every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [ip, timestamps] of this.hits.entries()) {
        const valid = timestamps.filter(t => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(ip);
        } else {
          this.hits.set(ip, valid);
        }
      }
    }, 120000).unref();
  }

  check(ip) {
    const now = Date.now();
    const timestamps = this.hits.get(ip) || [];
    const valid = timestamps.filter(t => now - t < this.windowMs);

    if (valid.length >= this.maxRequests) {
      const oldest = valid[0];
      const resetTime = oldest + this.windowMs;
      const retryAfterSec = Math.max(1, Math.ceil((resetTime - now) / 1000));
      return { allowed: false, retryAfter: retryAfterSec, remaining: 0, message: this.message };
    }

    valid.push(now);
    this.hits.set(ip, valid);
    return { allowed: true, remaining: this.maxRequests - valid.length };
  }
}

// Global Rate Limiter Instances
// 1. Voice Sessions: Max 3 requests per IP per 1 minute
const voiceRateLimiter = new MemoryRateLimiter(60 * 1000, 3, "Too many voice session requests. Please wait a minute before starting another call.");
// 2. Application Submissions & Modifications: Max 5 submissions per IP per 10 minutes
const appSubmitRateLimiter = new MemoryRateLimiter(10 * 60 * 1000, 5, "Too many application submissions from your IP. Please wait a few minutes before submitting again.");
// 3. Status Lookups / Tracking: Max 30 lookups per IP per 1 minute
const statusLookupRateLimiter = new MemoryRateLimiter(60 * 1000, 30, "Too many status lookup requests. Please slow down.");

module.exports = {
  getClientIp,
  MemoryRateLimiter,
  voiceRateLimiter,
  appSubmitRateLimiter,
  statusLookupRateLimiter
};
