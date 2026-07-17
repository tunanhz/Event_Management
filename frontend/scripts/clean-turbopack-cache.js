/**
 * Runs before every `next dev` (see "predev" in package.json). Turbopack's
 * persistent dev cache survives across restarts by design, but it can go
 * stale after adding/renaming route folders — pages that exist on disk then
 * 404 even after a full server restart, until this cache is cleared by hand.
 * Clearing it unconditionally on every dev start costs a few seconds of
 * re-compilation but removes that failure mode entirely.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", ".next", "dev", "cache", "turbopack");

try {
  // maxRetries/retryDelay absorb transient Windows file locks (antivirus scan,
  // an editor holding the file open, a previous dev server still shutting
  // down). If a lock persists past that, warn and let `next dev` start anyway
  // with the old cache rather than blocking startup entirely — a stale cache
  // is a much smaller problem than not being able to run the app at all.
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch (err) {
  console.warn(
    `[clean-turbopack-cache] Could not fully clear ${target} (${err.code ?? err.message}). ` +
      "Continuing with the existing cache — if pages start 404ing, stop the dev " +
      "server (check for a leftover node process holding the folder open) and rerun."
  );
}
