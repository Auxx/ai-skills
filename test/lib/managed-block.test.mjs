import { mkdtemp, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { markersFor, upsertManagedBlock } from '../../src/lib/managed-block.mjs';

const markers = markersFor('@hexmode/ai-skills');
const block = (content) => `${markers.start}\n\n${content}\n\n${markers.end}`;
const B = block('hello');
const oldBlock = block('old content');

describe('markersFor', () => {
  it('builds HTML comment markers', () => {
    expect(markers).toEqual({
      start: '<!-- @hexmode/ai-skills:start -->',
      end: '<!-- @hexmode/ai-skills:end -->',
    });
  });
});

describe('upsertManagedBlock', () => {
  let file;

  beforeEach(async () => {
    file = join(await mkdtemp(join(tmpdir(), 'ai-skills-block-')), 'CLAUDE.md');
  });

  const read = () => readFile(file, 'utf8');

  it('creates the file when missing', async () => {
    expect(await upsertManagedBlock(file, 'hello', markers)).toBe('created');
    expect(await read()).toBe(B + '\n');
  });

  it('trims the content inside the block', async () => {
    await upsertManagedBlock(file, '\n\nhello\n\n', markers);
    expect(await read()).toBe(B + '\n');
  });

  it('treats an empty or whitespace-only file as empty', async () => {
    await writeFile(file, '  \n\n');
    expect(await upsertManagedBlock(file, 'hello', markers)).toBe('updated');
    expect(await read()).toBe(B + '\n');
  });

  it('appends to a file without a block', async () => {
    await writeFile(file, '# Title\nText\n');
    expect(await upsertManagedBlock(file, 'hello', markers)).toBe('updated');
    expect(await read()).toBe('# Title\nText\n\n' + B + '\n');
  });

  it('replaces an existing block and keeps the rest', async () => {
    await writeFile(file, 'head\n' + oldBlock + '\ntail\n');
    expect(await upsertManagedBlock(file, 'hello', markers)).toBe('updated');
    expect(await read()).toBe('head\n' + B + '\ntail\n');
  });

  it('preserves CRLF text outside the block', async () => {
    await writeFile(file, 'a\r\nb\r\n' + oldBlock + '\r\nc\r\n');
    await upsertManagedBlock(file, 'hello', markers);
    expect(await read()).toBe('a\r\nb\r\n' + B + '\r\nc\r\n');
  });

  it('returns unchanged and does not write when identical', async () => {
    await writeFile(file, 'head\n' + B + '\n');
    const past = new Date('2020-01-01T00:00:00Z');
    await utimes(file, past, past);
    const before = (await stat(file)).mtimeMs;

    expect(await upsertManagedBlock(file, 'hello', markers)).toBe('unchanged');
    expect((await stat(file)).mtimeMs).toBe(before);
  });

  it.each([
    ['start only', `x\n${markers.start}\ny\n`],
    ['end only', `x\n${markers.end}\ny\n`],
    ['two blocks', `${oldBlock}\n${oldBlock}\n`],
    ['end before start', `${markers.end}\n${markers.start}\n`],
  ])('rejects malformed markers (%s) and leaves the file untouched', async (_, content) => {
    await writeFile(file, content);
    const error = await upsertManagedBlock(file, 'hello', markers).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(file);
    expect(error.message).toContain('marker');
    expect(await read()).toBe(content);
  });
});
