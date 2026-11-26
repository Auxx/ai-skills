import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { beforeEach, describe, expect, it } from 'vitest';

const bin = fileURLToPath(new URL('../bin/ai-skills.mjs', import.meta.url));
const exec = promisify(execFile);

async function cli(cwd, ...args) {
  try {
    const { stdout, stderr } = await exec(process.execPath, [bin, ...args], { cwd });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

describe('ai-skills CLI', () => {
  let cwd;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'ai-skills-cli-'));
  });

  it('prints usage with no command', async () => {
    const result = await cli(cwd);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Usage: ai-skills <command>');
    expect(result.stdout).toContain(
      '  init-docs  Create the docs/ skeleton and the CLAUDE.md documentation block',
    );
  });

  it.each(['--help', '-h'])('prints usage for %s', async (flag) => {
    const result = await cli(cwd, flag);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe((await cli(cwd)).stdout);
  });

  it('rejects an unknown command', async () => {
    const result = await cli(cwd, 'nope');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown command: nope');
    expect(result.stderr).toContain('Usage: ai-skills <command>');
  });

  it.each([['init-docs', '--help'], ['init-docs', '--dry-run']])(
    'rejects extra arguments (%s %s) without writing anything',
    async (...args) => {
      const result = await cli(cwd, ...args);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain(`Unexpected arguments: ${args[1]}`);
      expect(result.stderr).toContain('Usage: ai-skills <command>');
      expect(existsSync(join(cwd, 'docs'))).toBe(false);
      expect(existsSync(join(cwd, 'CLAUDE.md'))).toBe(false);
    },
  );

  it('runs init-docs in the working directory', async () => {
    const result = await cli(cwd, 'init-docs');

    expect(result.code).toBe(0);
    expect(existsSync(join(cwd, 'docs/product/glossary.md'))).toBe(true);
    expect(existsSync(join(cwd, 'CLAUDE.md'))).toBe(true);
    expect(result.stdout).toContain('created CLAUDE.md');
  });

  it('reports operation errors', async () => {
    await writeFile(join(cwd, 'CLAUDE.md'), '<!-- @hexmode/ai-skills:start -->\n');

    const result = await cli(cwd, 'init-docs');

    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^Error: /);
  });
});
