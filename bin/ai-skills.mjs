#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const operationsDir = fileURLToPath(new URL('../src/operations/', import.meta.url));

async function loadOperations() {
  const files = (await readdir(operationsDir)).filter((file) => file.endsWith('.mjs')).sort();
  return Promise.all(
    files.map(async (file) => ({
      name: file.slice(0, -'.mjs'.length),
      module: await import(pathToFileURL(join(operationsDir, file)).href),
    })),
  );
}

function usage(operations) {
  const width = Math.max(...operations.map(({ name }) => name.length));
  const commands = operations
    .map(({ name, module }) => `  ${name.padEnd(width)}  ${module.description}`)
    .join('\n');
  return `Usage: ai-skills <command>\n\nCommands:\n${commands}\n`;
}

async function main(args) {
  const operations = await loadOperations();
  const [command, ...rest] = args;

  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(usage(operations));
    return;
  }

  const operation = operations.find(({ name }) => name === command);
  if (!operation) {
    process.stderr.write(`Unknown command: ${command}\n\n${usage(operations)}`);
    process.exitCode = 1;
    return;
  }

  if (rest.length > 0) {
    process.stderr.write(`Unexpected arguments: ${rest.join(' ')}\n\n${usage(operations)}`);
    process.exitCode = 1;
    return;
  }

  await operation.module.run(process.cwd());
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
