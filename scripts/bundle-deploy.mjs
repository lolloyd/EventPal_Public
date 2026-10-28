import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const archiver = require("archiver");

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const staticSourceDir = path.join(rootDir, ".next", "static");
const publicSourceDir = path.join(rootDir, "public");
const appJsPath = path.join(rootDir, "app.js");

function getDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

const dateStamp = getDateStamp();
const zipFileName = `heypal-deploy_${dateStamp}.zip`;
const outputZipPath = path.join(rootDir, zipFileName);

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function bundle() {
  console.log("=================================================");
  console.log(" heyPal! Namecheap Standalone Bundle Generator   ");
  console.log("=================================================\n");

  if (!fs.existsSync(standaloneDir)) {
    console.error("Error: .next/standalone was not found.");
    console.error("Please run `npm run build` first before bundling.\n");
    process.exit(1);
  }

  // 1. Copy .next/static into .next/standalone/.next/static
  if (fs.existsSync(staticSourceDir)) {
    console.log("-> Copying .next/static into standalone package...");
    const destStatic = path.join(standaloneDir, ".next", "static");
    await copyDir(staticSourceDir, destStatic);
  }

  // 2. Copy public directory if exists
  if (fs.existsSync(publicSourceDir)) {
    console.log("-> Copying public/ into standalone package...");
    const destPublic = path.join(standaloneDir, "public");
    await copyDir(publicSourceDir, destPublic);
  }

  // 3. Copy app.js into standalone package
  if (fs.existsSync(appJsPath)) {
    console.log("-> Copying app.js into standalone package...");
    await fs.promises.copyFile(appJsPath, path.join(standaloneDir, "app.js"));
  }

  // 3b. Patch server.js to support standalone_modules directly (in case startup file is set to server.js)
  const standaloneServerJs = path.join(standaloneDir, "server.js");
  if (fs.existsSync(standaloneServerJs)) {
    const serverContent = await fs.promises.readFile(standaloneServerJs, "utf8");
    if (!serverContent.includes("standalone_modules")) {
      console.log("-> Patching server.js with standalone_modules resolution...");
      const patch = `// Auto-resolve standalone_modules for CloudLinux NodeJS Selector compatibility\nprocess.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '2';\nconst Module = require('module');\nconst origPaths = Module._nodeModulePaths;\nModule._nodeModulePaths = function(from) {\n  const p = origPaths.call(this, from);\n  const sm = require('path').join(__dirname, 'standalone_modules');\n  if (!p.includes(sm)) p.unshift(sm);\n  return p;\n};\n`;
      await fs.promises.writeFile(standaloneServerJs, patch + serverContent, "utf8");
    }
  }

  // 4. Ensure Events directory structure template exists
  console.log("-> Ensuring Events directory template is prepared...");
  const eventsTemplate = path.join(standaloneDir, "Events");
  await fs.promises.mkdir(path.join(eventsTemplate, "covers"), { recursive: true });
  await fs.promises.mkdir(path.join(eventsTemplate, "photos"), { recursive: true });
  await fs.promises.mkdir(path.join(eventsTemplate, "exports"), { recursive: true });
  await fs.promises.mkdir(path.join(eventsTemplate, "database"), { recursive: true });

  // Clean any local development SQLite files so the deploy bundle starts clean
  const dbDir = path.join(eventsTemplate, "database");
  const dbFiles = await fs.promises.readdir(dbDir);
  for (const f of dbFiles) {
    if (f.endsWith(".db") || f.endsWith(".db-wal") || f.endsWith(".db-shm")) {
      await fs.promises.unlink(path.join(dbDir, f));
    }
  }

  // 5. Ensure tmp directory exists for Passenger reload
  await fs.promises.mkdir(path.join(standaloneDir, "tmp"), { recursive: true });
  await fs.promises.writeFile(path.join(standaloneDir, "tmp", "restart.txt"), "", "utf8");

  // 6. Create ZIP archive
  console.log(`-> Creating compressed deployment archive: ${zipFileName}...`);
  if (fs.existsSync(outputZipPath)) {
    await fs.promises.unlink(outputZipPath);
  }
  // Also clean up legacy un-dated zip if present
  const legacyZipPath = path.join(rootDir, "heypal-deploy.zip");
  if (fs.existsSync(legacyZipPath)) {
    await fs.promises.unlink(legacyZipPath);
  }

  const entries = await fs.promises.readdir(standaloneDir, { withFileTypes: true });
  const outputStream = fs.createWriteStream(outputZipPath);
  const archive = typeof archiver === "function" 
    ? archiver("zip", { zlib: { level: 9 } }) 
    : new archiver.ZipArchive({ zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    outputStream.on("close", () => {
      const sizeMb = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`\nSuccessfully created ${zipFileName} (${sizeMb} MB)`);
      console.log("Your deployment archive is ready for upload to Namecheap cPanel!\n");
      resolve();
    });
    archive.on("error", (err) => reject(err));
    archive.pipe(outputStream);

    // Pack entries into zip, renaming node_modules to standalone_modules
    // This prevents the CloudLinux NodeJS Selector error:
    // "demands to store node modules for application in separate folder (virtual environment) pointed by symlink called node_modules"
    for (const entry of entries) {
      const fullPath = path.join(standaloneDir, entry.name);
      if (entry.name === "node_modules") {
        console.log("-> Packing standalone dependencies as standalone_modules/ (CloudLinux safe)...");
        archive.directory(fullPath, "standalone_modules");
      } else if (entry.isDirectory()) {
        archive.directory(fullPath, entry.name);
      } else {
        archive.file(fullPath, { name: entry.name });
      }
    }
    archive.finalize();
  });
}

bundle().catch((err) => {
  console.error("Bundle error:", err);
  process.exit(1);
});
