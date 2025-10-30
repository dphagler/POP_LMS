// Enable TS path aliases and TS transpile for node --test
// This affects *tests only*.
try { require('ts-node/register'); } catch {}
try { require('tsconfig-paths/register'); } catch {}
// Optional: tiny guard so a missing ts-node doesn't crash CI
// Node will still run .cjs tests fine without TS transpile.
