// Phusion Passenger startup file for Namecheap cPanel Node.js Application Manager
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

process.env.NODE_ENV = "production";
process.chdir(__dirname);

// Register standalone modules directory to satisfy CloudLinux NodeJS Selector
// CloudLinux demands that root 'node_modules' is a symlink to its virtual environment.
// Renaming standalone dependencies to 'standalone_modules' prevents CloudLinux creation conflicts.
const candidateModuleDirs = [
  path.join(__dirname, "standalone_modules"),
  path.join(__dirname, ".next", "standalone", "node_modules"),
  path.join(__dirname, "node_modules")
];

const existingDirs = candidateModuleDirs.filter((d) => fs.existsSync(d));
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
if (fs.existsSync(path.join(__dirname, "server.js"))) {
  require("./server.js");
} else if (fs.existsSync(path.join(__dirname, ".next", "standalone", "server.js"))) {
  require("./.next/standalone/server.js");
} else {
  throw new Error("Next.js standalone server.js was not found. Please verify deployment files.");
}
