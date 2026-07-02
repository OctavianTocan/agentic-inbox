# Changelog

## 1.0.0
- Initial release of `agy-review` — adversarial review of *anything* (plan, design, code change, writing, decision, argument, config, idea) via the `agy` (Antigravity) CLI.
- `scripts/agy-review.sh`: reads content from a file/arg/stdin, builds a neutral red-team prompt, and runs `agy` in print mode with the configured model (default `Gemini 3.5 Flash (High)`); optional `-c` context.
- Correct `agy` invocation: `--print` / `-p` takes the prompt as its value, so model/timeout flags are passed *before* it (`-p "$PROMPT"` last). Runs from a throwaway empty directory so `agy` never touches your repo.
- `SKILL.md` exposes a Claude Code argument hint and wires `$ARGUMENTS`; installable via `npx skills`.
