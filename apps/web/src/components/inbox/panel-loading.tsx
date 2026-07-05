import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';

/**
 * Centered loading state for a content panel while the inbox snapshot is
 * fetching; the surrounding chrome stays mounted and interactive.
 *
 * @param label - Short text shown beneath the spinner.
 * @returns The centered spinner panel.
 */
export function PanelLoading({ label }: { readonly label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <AgentSpinner label={label} size={1.125} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
