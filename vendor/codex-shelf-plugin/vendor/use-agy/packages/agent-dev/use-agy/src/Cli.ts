import * as Command from 'effect/unstable/cli/Command';
import { rootCommand } from './Command';

/** Runnable Effect CLI program for the `use-agy` binary. */
export const runCli = Command.run(rootCommand, {
  version: '0.0.0',
});

//<skill-gen>
// ---
// name: use-agy
// description: "Use AGY through the shared Effect service, Bun CLI, and local API/RPC runtime."
// ---
//
// ## CLI
//
// - `bin/use-agy` and package bin `use-agy` run the Bun-only Effect CLI.
// - Current commands are:
//   - `use-agy doctor`
//   - `use-agy run text <prompt>`
//   - `use-agy run json <prompt>`
// - The CLI follows the agent CLI contract: data on stdout, diagnostics on
//   stderr, no prompts in non-interactive paths, and stable failure exits.
// - Use `--json` for JSON-only stdout and `--plain` for terse machine-readable
//   stdout when a command supports them.
// - Add new commands only after the shared `Agy` service exposes the backing
//   behavior.
//</skill-gen>
