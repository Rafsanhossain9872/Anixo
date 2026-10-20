import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('catalog route imports with only the backend deployment files present', () => {
  const backend = fileURLToPath(new URL('../', import.meta.url));
  const isolatedRoot = mkdtempSync(join(tmpdir(), 'seo-catalog-import-'));
  const app = join(isolatedRoot, 'app');
  try {
    cpSync(join(backend, 'src'), join(app, 'src'), { recursive: true });
    cpSync(join(backend, 'package.json'), join(app, 'package.json'));
    symlinkSync(join(backend, 'node_modules'), join(app, 'node_modules'), 'junction');
    const output = execFileSync(process.execPath, ['--input-type=module', '-e',
      "const { default: router } = await import('./src/routes/seoCatalogRoutes.js'); if (typeof router !== 'function' || !router.stack.length) throw new Error('Catalog routes were not loaded'); console.log('Catalog routes loaded');",
    ], { cwd: app, encoding: 'utf8', timeout: 120000 });
    assert.match(output, /Catalog routes loaded/);
  } finally {
    rmSync(isolatedRoot, { recursive: true, force: true });
  }
});
