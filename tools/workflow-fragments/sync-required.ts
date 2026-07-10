const CMD_GENERATE = 'generate';
const CMD_CHECK = 'check';

const source = new URL('required-workflows.json', import.meta.url);
const target = new URL('../../required-workflows.json', import.meta.url);

const main = async (): Promise<void> => {
  const command = process.argv[2];

  if (command !== CMD_GENERATE && command !== CMD_CHECK) {
    console.error(
      `usage: bun run tools/workflow-fragments/sync-required.ts <${CMD_GENERATE}|${CMD_CHECK}>`
    );
    process.exit(1);
  }

  let sourceContent: string;

  try {
    sourceContent = await Bun.file(source).text();
  } catch {
    console.error(
      'sync-required: required-workflows.json source file not found'
    );
    process.exit(1);
  }

  if (command === CMD_GENERATE) {
    await Bun.write(target, sourceContent);
    console.log('generate: wrote required-workflows.json');
    process.exit(0);
  }

  let targetContent: string | undefined;

  try {
    targetContent = await Bun.file(target).text();
  } catch {
    targetContent = undefined;
  }

  if (targetContent === sourceContent) {
    console.log('check: required-workflows.json is up-to-date');
    process.exit(0);
  }

  console.error('check: required-workflows.json is out of date');
  console.error('run: bun run workflows:generate');
  process.exit(1);
};

try {
  await main();
} catch (error) {
  console.error(
    'sync-required failed:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
