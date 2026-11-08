import type { ComponentType } from "react";

export type ToolBlockComponent = ComponentType;

export type ToolRegistry = Record<string, ToolBlockComponent>;

/** Creates a new tool registry from the given component blocks. */
export function createToolRegistry(
  blocks: Record<string, ToolBlockComponent>,
): ToolRegistry {
  return { ...blocks };
}
