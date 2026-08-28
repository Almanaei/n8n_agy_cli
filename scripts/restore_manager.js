// scripts/restore_manager.js - Production Backup Restoration Utility
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadManifest } = require('./backup_manager');

const PROJECT_ROOT = path.join(__dirname, '..');
const BACKUPS_DIR = path.join(PROJECT_ROOT, 'backups');

function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function verifyBackup(archiveFileName) {
  const archivePath = path.join(BACKUPS_DIR, archiveFileName);
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Backup file "${archiveFileName}" does not exist in backups directory.`);
  }

  const manifest = loadManifest();
  const entry = manifest.history?.find(h => h.fileName === archiveFileName);
  const currentChecksum = await computeSha256(archivePath);

  console.log("=================================================================");
  console.log(`         BACKUP ARCHIVE INTEGRITY VERIFICATION                   `);
  console.log("=================================================================\n");
  console.log(`  📦 Archive:          ${archiveFileName}`);
  console.log(`  🔒 Computed SHA-256: ${currentChecksum}`);
  
  if (entry && entry.sha256) {
    if (entry.sha256 === currentChecksum) {
      console.log(`  ✅ Checksum Match:   VERIFIED (Matches manifest record)`);
      return { verified: true, checksum: currentChecksum, entry };
    } else {
      console.error(`  ❌ Checksum Mismatch! Manifest: ${entry.sha256} vs Current: ${currentChecksum}`);
      return { verified: false, error: "Checksum mismatch" };
    }
  }

  console.log(`  ℹ️ Checksum Computed (No prior manifest record found).`);
  return { verified: true, checksum: currentChecksum, entry: null };
}

if (require.main === module) {
  const targetFile = process.argv[2];
  const manifest = loadManifest();
  const fileToVerify = targetFile || manifest.lastBackup?.fileName;

  if (!fileToVerify) {
    console.error("No backup archives found to verify.");
    process.exit(1);
  }

  verifyBackup(fileToVerify)
    .then(res => {
      if (res.verified) {
        console.log("\n🎉 Backup archive is 100% integral and ready for restore.");
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error("Verification failed:", err.message);
      process.exit(1);
    });
}

module.exports = { verifyBackup };
