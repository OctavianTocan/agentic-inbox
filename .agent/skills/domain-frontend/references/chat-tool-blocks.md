# Chat Tool Blocks

How chat tool-result UI is organized in the current app-local chat panel.

## Current Shape

The app uses generic ai-ui part resolution plus a product-specific dynamic-tool component:

- `apps/web/src/ai-ui/types.ts` defines `dynamic-tool` and typed tool parts.
- `apps/web/src/ai-ui/resolver.tsx` maps message/part types to registered components.
- `apps/web/src/components/chat/panel.tsx` builds a `toolRegistry` from `TOOL_LABELS`.
- `apps/web/src/components/chat/labeled-tool-block.tsx` renders dynamic tool calls with status, input/output JSON, and inbox draft handoff.

## Adding a Tool Label

Add the label in `apps/web/src/components/chat/tool-labels.ts`. If the tool can hand off a draft to the inbox, include it in `DRAFT_TOOL_NAMES` and make sure its output carries enough fields for `toDraftPayload`.

## Adding a Specialized Tool UI

Use the generic `LabeledToolBlock` unless the tool output needs custom layout. If a custom block is necessary:

1. Create a kebab-case component under `apps/web/src/components/chat/`.
2. Read tool state through `usePart({ type: 'dynamic-tool' })`.
3. Register it explicitly in `panel.tsx` by passing it to `createToolRegistry`.
4. Keep input/output parsing local and typed; do not parse raw SSE in a tool block.

## Memoization

`LabeledToolBlock` is memoized at the export. Do not add per-field `useMemo` unless profiling shows a real render cost.

## Key Files

- `apps/web/src/components/chat/panel.tsx` — chat runtime and tool registry
- `apps/web/src/components/chat/labeled-tool-block.tsx` — default dynamic-tool UI
- `apps/web/src/components/chat/tool-labels.ts` — labels and draft-tool names
- `apps/web/src/components/chat/draft-bridge-context.ts` — chat-to-inbox handoff
- `apps/web/src/ai-ui/resolver.tsx` — message/part resolver
