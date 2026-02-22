import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sharedRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(sharedRoot, 'styles');
const targetDir = path.join(sharedRoot, 'dist', 'styles');

async function copyDirectoryRecursive(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function run() {
  try {
    await fs.access(sourceDir);
  } catch {
    console.warn(`[copy-styles] No styles directory found at: ${sourceDir}`);
    return;
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await copyDirectoryRecursive(sourceDir, targetDir);
  console.log(`[copy-styles] Copied styles to: ${targetDir}`);
}

run().catch((error) => {
  console.error('[copy-styles] Failed to copy styles:', error);
  process.exit(1);
});
