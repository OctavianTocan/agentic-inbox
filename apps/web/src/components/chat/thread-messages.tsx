'use client';

import { MessageProvider } from '@/ai-ui/providers/message-provider';
import { PartProvider } from '@/ai-ui/providers/part-provider';
import { useThread } from '@/ai-ui/providers/thread-provider';
import { createComponentResolver } from '@/ai-ui/resolver';
import { defaultComponents } from '@/design-system/components/ui/ai/blocks/defaults';

const resolver = createComponentResolver(defaultComponents);

/**
 * Renders the thread's messages through the design-system message and part
 * blocks, supplying each with its {@link MessageProvider}/{@link PartProvider}
 * context. Registered tool components (via the runtime's tool registry) take
 * over dynamic-tool parts.
 */
export function ThreadMessages() {
  const { messages } = useThread();
  const resolvedMessages = resolver.resolveMessages(messages);

  return (
    <>
      {resolvedMessages.map(({ Component, message, messageKey }) => {
        const parts = resolver.resolveParts(message);
        return (
          <MessageProvider key={messageKey} message={message}>
            <Component>
              {parts.map(
                ({ Component: PartComponent, part, partKey, index }) => (
                  <PartProvider
                    index={index}
                    isLast={index === message.parts.length - 1}
                    key={partKey}
                    part={part}
                  >
                    <PartComponent />
                  </PartProvider>
                )
              )}
            </Component>
          </MessageProvider>
        );
      })}
    </>
  );
}
