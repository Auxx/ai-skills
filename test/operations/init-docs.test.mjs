import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { description, run } from '../../src/operations/init-docs.mjs';

const docsTemplateDir = fileURLToPath(new URL('../../templates/init-docs/files/docs/', import.meta.url));

const ALL_PATHS = [
  'docs/architecture/decisions.md',
  'docs/architecture/non-functional.md',
  'docs/architecture/overview.md',
  'docs/product/glossary.md',
  'docs/product/mvp.md',
  'docs/product/vision.md',
  'docs/requirements/.gitkeep',
];

describe('init-docs templates', () => {
  it('every doc template is a product-agnostic draft', async () => {
    const entries = await readdir(docsTemplateDir, { recursive: true });
    const docs = entries.filter((entry) => entry.endsWith('.md'));
    expect(docs).toHaveLength(6);

    for (const doc of docs) {
      const lines = (await readFile(join(docsTemplateDir, doc), 'utf8')).split('\n');
      expect(lines[0], doc).toMatch(/^# \S/);
      expect(lines[2], doc).toBe('> Status: **Draft**');
      expect(lines.join('\n'), doc).not.toMatch(/front burner/i);
    }
  });
});

describe('init-docs operation', () => {
  let projectDir;
  let log;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'ai-skills-project-'));
    log = vi.fn();
  });

  it('has a description', () => {
    expect(description).toBe('Create the docs/ skeleton and the CLAUDE.md documentation block');
  });

  it('creates the full skeleton in an empty project', async () => {
    const result = await run(projectDir, log);

    expect(result).toEqual({ created: ALL_PATHS, skipped: [], claudeMd: 'created' });
    const claudeMd = await readFile(join(projectDir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('<!-- @hexmode/ai-skills:start -->');
    expect(claudeMd).toContain('<!-- @hexmode/ai-skills:end -->');
    expect(claudeMd).toContain('@docs/product/glossary.md');
  });

  it('keeps existing docs', async () => {
    await mkdir(join(projectDir, 'docs/product'), { recursive: true });
    await writeFile(join(projectDir, 'docs/product/vision.md'), 'mine');

    const result = await run(projectDir, log);

    expect(await readFile(join(projectDir, 'docs/product/vision.md'), 'utf8')).toBe('mine');
    expect(result.skipped).toEqual(['docs/product/vision.md']);
    expect(result.created).toEqual(ALL_PATHS.filter((p) => p !== 'docs/product/vision.md'));
  });

  it('is safe to run twice', async () => {
    await run(projectDir, log);
    const second = await run(projectDir, log);

    expect(second).toEqual({ created: [], skipped: ALL_PATHS, claudeMd: 'unchanged' });
  });

  it('logs one line per path', async () => {
    await run(projectDir, log);

    expect(log).toHaveBeenCalledTimes(8);
    expect(log.mock.calls[0][0]).toBe('created docs/architecture/decisions.md');
    expect(log.mock.calls.at(-1)[0]).toBe('created CLAUDE.md');

    log.mockClear();
    await run(projectDir, log);
    expect(log.mock.calls[0][0]).toBe('skipped docs/architecture/decisions.md (exists)');
    expect(log.mock.calls.at(-1)[0]).toBe('unchanged CLAUDE.md');
  });
});
