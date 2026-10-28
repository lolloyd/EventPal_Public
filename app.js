// Phusion Passenger startup file for Namecheap cPanel Node.js Application Manager
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

process.env.NODE_ENV = "production";
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || "1";
process.chdir(__dirname);

const logPath = path.join(__dirname, "app_startup.log");
function logStartup(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logPath, line, "utf8");
  } catch (_) {}
  console.log(msg);
}

logStartup(`heyPal! app.js initializing (Node ${process.version}, PID ${process.pid})`);

process.on("uncaughtException", (err) => {
  logStartup(`CRITICAL UNCAUGHT EXCEPTION: ${err && err.stack ? err.stack : err}`);
});

process.on("unhandledRejection", (reason) => {
  logStartup(`UNHANDLED PROMISE REJECTION: ${reason && reason.stack ? reason.stack : reason}`);
});

// Register standalone modules directory to satisfy CloudLinux NodeJS Selector
// CloudLinux demands that root 'node_modules' is a symlink to its virtual environment.
// Renaming standalone dependencies to 'standalone_modules' prevents CloudLinux creation conflicts.
const candidateModuleDirs = [
  path.join(__dirname, "standalone_modules"),
  path.join(__dirname, ".next", "standalone", "node_modules"),
  path.join(__dirname, "node_modules")
];

const existingDirs = candidateModuleDirs.filter((d) => fs.existsSync(d));
logStartup(`Module search candidates found: ${existingDirs.map((d) => path.basename(d)).join(", ") || "none"}`);

if (existingDirs.length > 0) {
  const origNodeModulePaths = Module._nodeModulePaths;
  Module._nodeModulePaths = function (from) {
    const paths = origNodeModulePaths.call(this, from);
    for (const d of existingDirs) {
      if (!paths.includes(d)) {
        paths.unshift(d);
      }
    }
    return paths;
  };
}

// Support both flat standalone layout (recommended for cPanel) and nested .next/standalone layout
const targetServer = fs.existsSync(path.join(__dirname, "server.js"))
  ? "./server.js"
  : fs.existsSync(path.join(__dirname, ".next", "standalone", "server.js"))
    ? "./.next/standalone/server.js"
    : null;

if (!targetServer) {
  const err = "Next.js standalone server.js was not found. Please verify deployment files.";
  logStartup(`ERROR: ${err}`);
  throw new Error(err);
}

logStartup(`Requiring ${targetServer}...`);
require(targetServer);
logStartup(`Successfully invoked ${targetServer}. HTTP listener active.`);
