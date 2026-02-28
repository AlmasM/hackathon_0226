#!/usr/bin/env node
/**
 * Run frontend dev server with project root set from this script's location.
 * Use when you get EPERM: operation not permitted, uv_cwd (e.g. in some terminals).
 *
 * Run: node scripts/serve-frontend.js
 */
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const nx = path.join(projectRoot, "node_modules", ".bin", "nx");
const isWindows = process.platform === "win32";
const nxCmd = isWindows ? nx + ".cmd" : nx;

process.chdir(projectRoot);
const child = spawn(nxCmd, ["run", "frontend:serve"], {
  stdio: "inherit",
  shell: true,
  cwd: projectRoot,
});
child.on("exit", (code, signal) => process.exit(code !== null ? code : signal ? 1 : 0));
