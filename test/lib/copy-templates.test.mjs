import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { copyTemplates } from '../../src/lib/copy-templates.mjs';

async function put(root, relPath, content) {
  const file = join(root, relPath);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

describe('copyTemplates', () => {
  let templateDir;
  let targetDir;

  beforeEach(async () => {
    templateDir = await mkdtemp(join(tmpdir(), 'ai-skills-tpl-'));
    targetDir = await mkdtemp(join(tmpdir(), 'ai-skills-target-'));
    await put(templateDir, 'a.md', 'template a');
    await put(templateDir, 'x/y/b.md', 'template b');
  });

  it('copies nested files and creates directories', async () => {
    const result = await copyTemplates(templateDir, targetDir);

    expect(result).toEqual({ created: ['a.md', 'x/y/b.md'], skipped: [] });
    expect(await readFile(join(targetDir, 'a.md'), 'utf8')).toBe('template a');
    expect(await readFile(join(targetDir, 'x/y/b.md'), 'utf8')).toBe('template b');
  });

  it('copies dotfiles', async () => {
    await put(templateDir, 'd/.gitkeep', '');

    const result = await copyTemplates(templateDir, targetDir);

    expect(result.created).toContain('d/.gitkeep');
    expect(existsSync(join(targetDir, 'd/.gitkeep'))).toBe(true);
  });

  it('skips existing files without changing them', async () => {
    await put(targetDir, 'a.md', 'mine');

    const result = await copyTemplates(templateDir, targetDir);

    expect(result).toEqual({ created: ['x/y/b.md'], skipped: ['a.md'] });
    expect(await readFile(join(targetDir, 'a.md'), 'utf8')).toBe('mine');
  });
});
