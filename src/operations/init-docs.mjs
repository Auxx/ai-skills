import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyTemplates } from '../lib/copy-templates.mjs';
import { markersFor, upsertManagedBlock } from '../lib/managed-block.mjs';

const templateRoot = fileURLToPath(new URL('../../templates/init-docs/', import.meta.url));

export const description = 'Create the docs/ skeleton and the CLAUDE.md documentation block';

/**
 * @param {string} projectDir
 * @param {(line: string) => void} [log]
 * @returns {Promise<{ created: string[], skipped: string[], claudeMd: 'created' | 'updated' | 'unchanged' }>}
 */
export async function run(projectDir, log = console.log) {
  const { created, skipped } = await copyTemplates(join(templateRoot, 'files'), projectDir);
  for (const file of [...created, ...skipped].sort()) {
    log(created.includes(file) ? `created ${file}` : `skipped ${file} (exists)`);
  }

  const block = await readFile(join(templateRoot, 'claude-block.md'), 'utf8');
  const claudeMd = await upsertManagedBlock(
    join(projectDir, 'CLAUDE.md'),
    block,
    markersFor('@hexmode/ai-skills'),
  );
  log(`${claudeMd} CLAUDE.md`);

  return { created, skipped, claudeMd };
}
