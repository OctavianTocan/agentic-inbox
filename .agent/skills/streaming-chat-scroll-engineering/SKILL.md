---
name: streaming-chat-scroll-engineering
description: Use when building, reviewing, or debugging streaming chat transcripts, message scrollers, auto-scroll, jump-to-latest behavior, long conversation navigation, markdown/image layout shifts, or accessibility in AI chat interfaces.
metadata:
  stages:
    - plan
    - build
    - test
    - review
---

# Streaming Chat Scroll Engineering

Never move the reader against their intent.

## Principles

1. Move only when the reader asked to move.
2. Follow only while the reader is following.
3. Treat every interaction as intent: scrolling, text selection, keyboard use, link opening, and search all stop auto-follow.
4. Start a new turn near the top of the viewport so the reader can read it from the beginning.
5. Stream the answer into the available space after the new turn is positioned.
6. Keep enough previous conversation visible to preserve context.
7. Let new content arrive offscreen when the reader is not following.
8. Show when streaming or new messages are happening out of view.
9. Provide a Jump to latest action that returns to the live edge and resumes following.
10. Support jumping anywhere in long conversations with message links, search, unread markers, and direct navigation.
11. Reopen saved conversations at the last meaningful turn, usually the last user message, not the absolute bottom.
12. Preserve the reader's place when images load, markdown expands, code blocks render, or older messages are prepended.
13. Handle stop, retry, regenerate, branching, and errors without stealing scroll position.
14. Keep long threads responsive while streaming text, markdown, code, images, and history.
15. Keep the transcript keyboard navigable, preserve focus, and announce important events at a comfortable pace.

## Implementation Checklist

- Model follow state separately from scroll position.
- Disable follow on user intent, not only on scroll events.
- Use a visible out-of-view streaming/new-message indicator.
- Add tests for layout shifts, retry/regenerate, prepend history, and Jump to latest.
- Prefer shadcn chat primitives for `message-scroller`, `message`, `bubble`, `attachment`, and `marker`, then adapt styling to the local design system.
