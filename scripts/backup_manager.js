// scripts/backup_manager.js - Automated Production Backup & Maintenance Utility
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

const PROJECT_ROOT = path.join(__dirname, '..');
const BACKUPS_DIR = path.join(PROJECT_ROOT, 'backups');
const MANIFEST_PATH = path.join(BACKUPS_DIR, 'backup_manifest.json');
const MAX_BACKUP_RETENTION_COUNT = 30; // Keep last 30 backups

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    } catch (e) {
      console.warn("[Backup] Corrupt manifest, initializing fresh manifest.");
    }
  }
  return { lastBackup: null, totalBackups: 0, history: [] };
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

function applyRetentionPolicy() {
  console.log(`[Backup Maintenance] Enforcing retention policy (Max ${MAX_BACKUP_RETENTION_COUNT} archives)...`);
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('civildefense-backup-') && f.endsWith('.zip'))
    .map(f => ({
      name: f,
      fullPath: path.join(BACKUPS_DIR, f),
      ctime: fs.statSync(path.join(BACKUPS_DIR, f)).ctimeMs
    }))
    .sort((a, b) => b.ctime - a.ctime); // Newest first

  if (files.length > MAX_BACKUP_RETENTION_COUNT) {
    const toDelete = files.slice(MAX_BACKUP_RETENTION_COUNT);
    toDelete.forEach(item => {
      console.log(`  🗑️ Purging expired backup archive: ${item.name}`);
      try {
        fs.unlinkSync(item.fullPath);
      } catch (err) {
        console.error(`  Failed to delete ${item.name}:`, err.message);
      }
    });
  }
}

async function createBackup() {
  const startTime = Date.now();
  const dateStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const archiveFileName = `civildefense-backup-${dateStr}.zip`;
  const archivePath = path.join(BACKUPS_DIR, archiveFileName);

  console.log("=================================================================");
  console.log(`    STARTING AUTOMATED PRODUCTION BACKUP: ${archiveFileName}     `);
  console.log("=================================================================\n");

  const output = fs.createWriteStream(archivePath);
  const ZipClass = archiver.ZipArchive || archiver;
  const archive = new ZipClass({
    zlib: { level: 9 } // Maximum compression
  });

  let totalFilesArchived = 0;
  let uncompressedSizeBytes = 0;

  return new Promise((resolve, reject) => {
    output.on('close', async () => {
      try {
        const compressedSizeBytes = archive.pointer();
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
        const checksum = await computeSha256(archivePath);

        const compressionRatio = uncompressedSizeBytes > 0 
          ? (((uncompressedSizeBytes - compressedSizeBytes) / uncompressedSizeBytes) * 100).toFixed(1)
          : '0.0';

        console.log(`\n🎉 Backup Completed Successfully!`);
        console.log(`-----------------------------------------------------------------`);
        console.log(`  📦 Archive File:      ${archiveFileName}`);
        console.log(`  📁 Total Files:       ${totalFilesArchived}`);
        console.log(`  📊 Uncompressed Size: ${(uncompressedSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`  💾 Compressed Size:   ${(compressedSizeBytes / (1024 * 1024)).toFixed(2)} MB (${compressionRatio}% space saved)`);
        console.log(`  🔒 SHA-256 Checksum:  ${checksum}`);
        console.log(`  ⏱️ Elapsed Time:      ${durationSec}s`);
        console.log(`-----------------------------------------------------------------`);

        // Update Manifest
        const manifest = loadManifest();
        const backupEntry = {
          fileName: archiveFileName,
          filePath: archivePath,
          timestamp: new Date().toISOString(),
          totalFiles: totalFilesArchived,
          uncompressedBytes: uncompressedSizeBytes,
          compressedBytes: compressedSizeBytes,
          compressionRatioPercent: compressionRatio,
          sha256: checksum,
          status: "healthy"
        };

        manifest.lastBackup = backupEntry;
        manifest.totalBackups = (manifest.totalBackups || 0) + 1;
        manifest.history.unshift(backupEntry);
        manifest.history = manifest.history.slice(0, 100); // Keep last 100 logs
        saveManifest(manifest);

        // Apply retention cleanup
        applyRetentionPolicy();

        resolve(backupEntry);
      } catch (err) {
        reject(err);
      }
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn("[Backup Warning]:", err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // 1. Archive ./uploads/ directory (Citizen PDF Blueprints & Documents)
    const uploadsDir = path.join(PROJECT_ROOT, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const uploadFiles = fs.readdirSync(uploadsDir);
      console.log(`  [1/4] Archiving uploads/ directory (${uploadFiles.length} citizen documents)...`);
      uploadFiles.forEach(f => {
        const full = path.join(uploadsDir, f);
        if (fs.statSync(full).isFile()) {
          const stats = fs.statSync(full);
          uncompressedSizeBytes += stats.size;
          totalFilesArchived++;
          archive.file(full, { name: `uploads/${f}` });
        }
      });
    }

    // 2. Archive database.sqlite (n8n Database)
    const dbPath = path.join(PROJECT_ROOT, 'database.sqlite');
    if (fs.existsSync(dbPath)) {
      console.log(`  [2/4] Archiving n8n SQLite Database (database.sqlite)...`);
      const stats = fs.statSync(dbPath);
      uncompressedSizeBytes += stats.size;
      totalFilesArchived++;
      archive.file(dbPath, { name: 'database.sqlite' });
    }

    // 3. Archive Configuration & System Prompts
    const configFiles = [
      '.env',
      'ecosystem.config.js',
      'system_prompt.js',
      'workflow_service_applications.json',
      'all_kb_services_list.json',
      'manifest.json'
    ];

    console.log(`  [3/4] Archiving system configurations & workflow JSONs...`);
    configFiles.forEach(f => {
      const full = path.join(PROJECT_ROOT, f);
      if (fs.existsSync(full)) {
        const stats = fs.statSync(full);
        uncompressedSizeBytes += stats.size;
        totalFilesArchived++;
        archive.file(full, { name: `config/${f}` });
      }
    });

    // 4. Archive Icons
    const iconsDir = path.join(PROJECT_ROOT, 'icons');
    if (fs.existsSync(iconsDir)) {
      console.log(`  [4/4] Archiving PWA high-DPI icon assets...`);
      fs.readdirSync(iconsDir).forEach(f => {
        const full = path.join(iconsDir, f);
        if (fs.statSync(full).isFile()) {
          const stats = fs.statSync(full);
          uncompressedSizeBytes += stats.size;
          totalFilesArchived++;
          archive.file(full, { name: `icons/${f}` });
        }
      });
    }

    archive.finalize();
  });
}

if (require.main === module) {
  createBackup()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("❌ Backup failed with error:", err);
      process.exit(1);
    });
}

module.exports = { createBackup, loadManifest, applyRetentionPolicy };
