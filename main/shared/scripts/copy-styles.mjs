import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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

function withHashInFilename(filePath, hash) {
  const extension = path.extname(filePath);
  const basename = path.basename(filePath, extension);
  const dirname = path.dirname(filePath);
  return path.join(dirname, `${basename}.${hash}${extension}`);
}

async function createHashedThemeArtifacts() {
  const manifestPath = path.join(targetDir, 'theme-manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (error) {
    console.warn(`[copy-styles] Could not read theme manifest at ${manifestPath}:`, error);
    return;
  }

  if (!Array.isArray(manifest)) {
    console.warn('[copy-styles] Theme manifest is not an array. Skipping hash rewrite.');
    return;
  }

  for (const theme of manifest) {
    if (!theme?.styles || typeof theme.styles !== 'object') continue;

    for (const styleKey of Object.keys(theme.styles)) {
      const stylePath = theme.styles[styleKey];
      if (typeof stylePath !== 'string' || !stylePath.endsWith('.css')) continue;

      const relativeStylePath = stylePath.replace(/^\//, '');
      const absoluteStylePath = path.join(sharedRoot, 'dist', relativeStylePath.replace(/^shared\//, ''));

      try {
        const cssBuffer = await fs.readFile(absoluteStylePath);
        const hash = crypto.createHash('sha256').update(cssBuffer).digest('hex').slice(0, 12);
        const hashedAbsolutePath = withHashInFilename(absoluteStylePath, hash);
        const hashedRelativePathFromDist = path.relative(path.join(sharedRoot, 'dist'), hashedAbsolutePath).replaceAll(path.sep, '/');
        const hashedStylePath = `/shared/${hashedRelativePathFromDist}`;
        await fs.writeFile(hashedAbsolutePath, cssBuffer);
        theme.styles[styleKey] = hashedStylePath;
      } catch (error) {
        console.warn(`[copy-styles] Could not hash ${stylePath}:`, error);
      }
    }
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
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
  await createHashedThemeArtifacts();
  console.log(`[copy-styles] Copied styles to: ${targetDir}`);
}

run().catch((error) => {
  console.error('[copy-styles] Failed to copy styles:', error);
  process.exit(1);
});
