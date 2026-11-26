import { readFile, writeFile } from 'node:fs/promises';

/**
 * @param {string} name usually the package name
 * @returns {{ start: string, end: string }}
 */
export function markersFor(name) {
  return { start: `<!-- ${name}:start -->`, end: `<!-- ${name}:end -->` };
}

function countOccurrences(text, search) {
  return text.split(search).length - 1;
}

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Inserts a marked block into `filePath`, or replaces the existing one.
 * Text outside the block is preserved exactly.
 *
 * @param {string} filePath
 * @param {string} content text placed between the markers (trimmed)
 * @param {{ start: string, end: string }} markers
 * @returns {Promise<'created' | 'updated' | 'unchanged'>}
 */
export async function upsertManagedBlock(filePath, content, { start, end }) {
  const existing = await readIfExists(filePath);
  const eol = existing?.includes('\r\n') ? '\r\n' : '\n';
  const body = content.trim().replace(/\r?\n/g, eol);
  const block = `${start}${eol}${eol}${body}${eol}${eol}${end}`;

  if (existing === null) {
    await writeFile(filePath, block + eol);
    return 'created';
  }

  const starts = countOccurrences(existing, start);
  const ends = countOccurrences(existing, end);
  let next;

  if (starts === 0 && ends === 0) {
    next = existing.trim() === '' ? block + eol : existing.trimEnd() + eol + eol + block + eol;
  } else if (starts === 1 && ends === 1 && existing.indexOf(start) < existing.indexOf(end)) {
    const from = existing.indexOf(start);
    const to = existing.indexOf(end) + end.length;
    next = existing.slice(0, from) + block + existing.slice(to);
  } else {
    throw new Error(
      `${filePath}: malformed managed block, expected exactly one "${start}" marker followed by one "${end}" marker`,
    );
  }

  if (next === existing) return 'unchanged';
  await writeFile(filePath, next);
  return 'updated';
}
