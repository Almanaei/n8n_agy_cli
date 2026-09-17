// src/utils/file_utils.js - File & PDF Validation, Sanitization, and Storage Utilities
const fs = require('fs');
const path = require('path');

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const uploadsDir = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function validateAndSanitizePdfBase64(rawBase64, originalFileName) {
  if (!rawBase64 || typeof rawBase64 !== 'string') {
    return { valid: false, error: "Missing or invalid file content." };
  }

  const cleanBase64 = rawBase64.replace(/^data:application\/pdf;base64,/, "").trim();
  let buffer;
  try {
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch (e) {
    return { valid: false, error: "Corrupted base64 payload." };
  }

  if (buffer.length === 0) {
    return { valid: false, error: "Uploaded file is empty (0 bytes)." };
  }

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    return { valid: false, error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 10 MB.` };
  }

  // Security Check: Magic Bytes for PDF (%PDF- / 0x25 0x50 0x44 0x46)
  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    return { valid: false, error: "Security rejection: File must be a genuine PDF document (%PDF- magic bytes required)." };
  }

  // Sanitize original file name: remove path traversal, special characters
  let sanitizedName = (originalFileName || 'document.pdf')
    .replace(/[^\w\d_\-. \u0600-\u06FF]/g, '')
    .trim();
  if (!sanitizedName.toLowerCase().endsWith('.pdf')) {
    sanitizedName += '.pdf';
  }

  return {
    valid: true,
    buffer,
    cleanBase64,
    sizeBytes: buffer.length,
    sanitizedName
  };
}

function saveUploadedBuffer(buffer, fileNamePrefix, sanitizedOriginalName) {
  const safeBase = (sanitizedOriginalName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = `${fileNamePrefix}_${safeBase}`;
  const diskPath = path.join(uploadsDir, safeName);
  fs.writeFileSync(diskPath, buffer);
  return { safeName, diskPath };
}

module.exports = {
  MAX_PDF_SIZE_BYTES,
  uploadsDir,
  validateAndSanitizePdfBase64,
  saveUploadedBuffer
};
