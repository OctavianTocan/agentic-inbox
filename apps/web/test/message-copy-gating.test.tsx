import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MessageProvider } from '../src/ai-ui/providers/message-provider';
import { ThreadProvider } from '../src/ai-ui/providers/thread-provider';
import type { ChatAdapter, ThreadStatus, UIMessage } from '../src/ai-ui/types';
import { AssistantMessageBlock } from '../src/design-system/components/ui/ai/blocks/message-blocks';
import { CodeView } from '../src/design-system/components/ui/code-view/code-view';

afterEach(cleanup);

/** Minimal adapter exposing only the thread state the providers read in these tests. */
function fakeAdapter(
  messages: readonly UIMessage[],
  status: ThreadStatus
): ChatAdapter {
  return {
    messages,
    status,
    sendMessage: async () => {},
    stop: () => {},
    regenerate: async () => {},
    edit: async () => {},
    setMessages: () => {},
    addToolOutput: async () => {},
    clearError: () => {}
  };
}

/** Renders the assistant block for a single message under a controlled thread status. */
function renderAssistant(
  message: UIMessage,
  status: ThreadStatus,
  children?: ReactNode
) {
  return render(
    <ThreadProvider adapter={fakeAdapter([message], status)}>
      <MessageProvider message={message}>
        <AssistantMessageBlock>{children}</AssistantMessageBlock>
      </MessageProvider>
    </ThreadProvider>
  );
}

const messageWith = (text: string): UIMessage => ({
  id: 'assistant-1',
  role: 'assistant',
  parts: text ? [{ type: 'text', text, state: 'done' }] : []
});

describe('assistant message copy-button gating', () => {
  it('shows the copy button for a completed message with text', () => {
    renderAssistant(messageWith('Here are three items.'), { type: 'ready' });
    // A visible copy affordance means the user can act on a finished reply.
    expect(screen.getByRole('button', { name: /copy/i })).toBeTruthy();
  });

  it('hides the copy button while the message is still streaming', () => {
    // The last message during a streaming turn is the in-flight reply; copying
    // a half-written answer would hand the user a truncated message.
    renderAssistant(messageWith('Here are'), { type: 'streaming' });
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
  });

  it('hides the copy button for an empty reply that never arrived', () => {
    // An assistant turn that produced no text has nothing to copy; the button
    // must not appear on the empty bubble.
    renderAssistant(messageWith(''), { type: 'ready' });
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
  });
});

describe('embedded copy-affordance gating during streaming', () => {
  // A fenced code block streams as a CodeView the moment its markdown node
  // parses — well before the turn finishes. Its own hover-revealed copy button
  // is a copy affordance that must not leak mid-stream (on touch it has no
  // hover to hide behind), so it stays suppressed until the message completes.
  const codeBlock = <CodeView code={'{\n  "id": "e-001"\n}'} language="json" />;

  it('renders no copy affordance inside a streaming code block', () => {
    renderAssistant(
      messageWith('Here is the record'),
      { type: 'streaming' },
      codeBlock
    );
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
  });

  it('renders the code block copy affordance once the message completes', () => {
    renderAssistant(
      messageWith('Here is the record'),
      { type: 'ready' },
      codeBlock
    );
    // The completed reply gives two copy controls: the code block's own button
    // and the message footer; both are legitimate now that nothing is in flight.
    expect(
      screen.getAllByRole('button', { name: /copy/i }).length
    ).toBeGreaterThan(0);
  });
});
