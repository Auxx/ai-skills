import { constants } from 'node:fs';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';

/**
 * Copies every file under `templateDir` into `targetDir`, keeping relative
 * paths. Files that already exist in `targetDir` are left untouched.
 *
 * @param {string} templateDir
 * @param {string} targetDir
 * @returns {Promise<{ created: string[], skipped: string[] }>} paths relative
 *   to `targetDir`, `/`-separated, sorted
 */
export async function copyTemplates(templateDir, targetDir) {
  const entries = await readdir(templateDir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(templateDir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();

  const created = [];
  const skipped = [];

  for (const file of files) {
    const target = join(targetDir, file);
    await mkdir(dirname(target), { recursive: true });
    try {
      await copyFile(join(templateDir, file), target, constants.COPYFILE_EXCL);
      created.push(file);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      skipped.push(file);
    }
  }

  return { created, skipped };
}
