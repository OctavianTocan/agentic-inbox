import { Schema } from 'effect';
import { Prompt } from 'effect/unstable/ai';
import { describe, expect, it } from 'vitest';
import { withSendReplyBody } from '@/Modules/Agent/Service';

const encodePrompt = Schema.encodeSync(Prompt.Prompt);

/** Builds a paused prompt with one send_reply tool call and its approval request. */
const pausedPrompt = (toolCallId: string): Prompt.Prompt =>
  Prompt.fromMessages([
    Prompt.makeMessage('system', { content: 'triage' }),
    Prompt.makeMessage('assistant', {
      content: [
        Prompt.makePart('tool-call', {
          id: toolCallId,
          name: 'send_reply',
          params: {
            emailId: 'e-001',
            body: 'Agent original draft',
            summary: 'Acknowledge customer request'
          },
          providerExecuted: false
        }),
        Prompt.makePart('tool-approval-request', {
          approvalId: 'appr-1',
          toolCallId
        })
      ]
    })
  ]);

/** Reads the params of the first tool-call part in an encoded prompt. */
const firstToolCallParams = (
  prompt: Prompt.Prompt
): Record<string, unknown> => {
  const encoded = encodePrompt(prompt);
  for (const message of encoded.content) {
    if (message.role !== 'assistant' || typeof message.content === 'string') {
      continue;
    }
    for (const part of message.content) {
      if (part.type === 'tool-call') {
        const params = part.params;
        return typeof params === 'object' &&
          params !== null &&
          !Array.isArray(params)
          ? { ...params }
          : {};
      }
    }
  }
  return {};
};

describe('withSendReplyBody', () => {
  it('swaps the paused send_reply body for the reviewer edit', () => {
    // Approve-with-edits must send the reviewer's text, not the agent draft:
    // the resumed prompt has to carry the edited body into the send handler.
    const result = withSendReplyBody(
      pausedPrompt('call-1'),
      'call-1',
      'Reviewer edited reply'
    );

    const params = firstToolCallParams(result);
    expect(params.body).toBe('Reviewer edited reply');
    // Other params (target email, summary label) survive the swap untouched.
    expect(params.emailId).toBe('e-001');
    expect(params.summary).toBe('Acknowledge customer request');
  });

  it('re-decodes cleanly after the swap', () => {
    // The mutated prompt is persisted and later resumed, so it must round-trip
    // through the Prompt schema without loss.
    const result = withSendReplyBody(
      pausedPrompt('call-1'),
      'call-1',
      'Reviewer edited reply'
    );
    expect(() =>
      Schema.decodeUnknownSync(Prompt.Prompt)(encodePrompt(result))
    ).not.toThrow();
  });

  it('leaves the prompt unchanged when no tool call matches', () => {
    // A mismatched tool-call id (e.g. an archive-only approval) must not touch
    // any body; the returned prompt equals the input encoding.
    const input = pausedPrompt('call-1');
    const result = withSendReplyBody(input, 'call-missing', 'ignored');
    expect(encodePrompt(result)).toEqual(encodePrompt(input));
  });
});
