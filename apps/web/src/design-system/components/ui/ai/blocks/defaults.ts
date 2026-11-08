import type { ComponentMap } from "@/ai-ui/resolver";
import { AssistantMessageBlock, UserMessageBlock } from "./message-blocks";
import { FilePartBlock } from "./part-blocks/file-part-block";
import { ReasoningPartBlock } from "./part-blocks/reasoning-part-block";
import { TextPartBlock } from "./part-blocks/text-part-block";
import { ToolCallPartBlock } from "./part-blocks/tool-call-part-block";

export const defaultComponents: ComponentMap = {
  messages: {
    user: UserMessageBlock,
    assistant: AssistantMessageBlock,
  },
  parts: {
    text: TextPartBlock,
    reasoning: ReasoningPartBlock,
    "dynamic-tool": ToolCallPartBlock,
    file: FilePartBlock,
  },
};
