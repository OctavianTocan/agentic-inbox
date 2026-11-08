/**
 * Fixed bottom-left badge shown when the app is running without live DB or AI.
 */
export function DemoModeSticker() {
  return (
    <p
      className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-md border border-border bg-background/95 px-2.5 py-1 font-mono text-[11px] tracking-wide text-muted-foreground shadow-sm backdrop-blur-sm"
      role="status"
    >
      Demo mode
    </p>
  );
}
