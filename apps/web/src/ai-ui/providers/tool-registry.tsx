"use client";

import { createContext, use } from "react";
import type { ToolRegistry } from "./tool-registry-utils";

export type { ToolBlockComponent, ToolRegistry } from "./tool-registry-utils";

const ToolRegistryContext = createContext<ToolRegistry>({});

/** Provides a tool component registry to descendant components. */
export function ToolRegistryProvider({
  registry,
  children,
}: {
  registry: ToolRegistry;
  children: React.ReactNode;
}) {
  return (
    <ToolRegistryContext.Provider value={registry}>
      {children}
    </ToolRegistryContext.Provider>
  );
}

/** Reads the surrounding `ToolRegistryProvider` context. */
export function useToolRegistry(): ToolRegistry {
  return use(ToolRegistryContext);
}
