/**
 * Syntax check for frontend JS files using Node's --input-type=module.
 * Exits 0 on success, 1 on any parse error.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FRONTEND_DIR = resolve(__dirname, "..");

const FILES = [
  "main.js",
  "bloodstream.js",
  "panel.js",
  "gauge.js",
  "typomap.js",
];

let failed = false;

for (const filename of FILES) {
  const filepath = join(FRONTEND_DIR, filename);
  try {
    const source = readFileSync(filepath, "utf8");
    // Use node --input-type=module to parse as ESM
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--check"],
      { input: source, encoding: "utf8" }
    );
    if (result.status === 0) {
      console.log(`OK: ${filename}`);
    } else {
      console.error(`FAIL: ${filename} — ${(result.stderr || "").split("\n")[0]}`);
      failed = true;
    }
  } catch (err) {
    console.error(`MISSING: ${filename} — ${err.message}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
