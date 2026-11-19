// Leonida Trophy Guide — the entry program for make.fun's gta6-trophy-guide-01.
// Node 22, standard library only. It takes this folder's app/ (the offline guide:
// index.html, its scripts and styles, and data/trophies.json) and screenshots/
// (real renders of the guide in a browser) and hands them to the grader in /output,
// with a dossier.json written by the vendored make.fun library so the judge can
// read the entry. vendor/makefun-frontend.ts is the kit's copy and must stay untouched:
// the scorer rebuilds the dossier from the same library and compares byte for byte.
//
// Run it locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root is the folder this file lives in; the grader's output
// directory is /output unless MAKEFUN_OUTPUT_DIR points somewhere else.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyEntryTree() {
  mkdirSync(outputDir, { recursive: true });
  // Start clean so a stale screenshot or dossier from an earlier run can never
  // leak into this one: the output must be exactly this commit's entry.
  rmSync(join(outputDir, 'app'), { recursive: true, force: true });
  rmSync(join(outputDir, 'screenshots'), { recursive: true, force: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  } else {
    mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  }
}

function writeEntryDossier() {
  // The caps below mirror the scorer's gate: at most 4 screenshots of 256 KiB,
  // app/ at most 993 entries and 48 MiB, and the dossier text at most 160 KiB.
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

copyEntryTree();
writeEntryDossier();
