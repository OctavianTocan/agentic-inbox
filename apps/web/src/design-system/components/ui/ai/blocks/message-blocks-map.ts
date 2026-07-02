import { AssistantMessageBlock, UserMessageBlock } from "./message-blocks";

/** Convenience lookup mapping role strings to their default block components. */
export const MessageBlocks = {
  user: UserMessageBlock,
  assistant: AssistantMessageBlock,
};
