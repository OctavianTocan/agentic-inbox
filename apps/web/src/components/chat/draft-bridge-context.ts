'use client';

import { createContext, use } from 'react';

/** Draft handed from a chat tool part to the inbox detail pane. */
export interface DraftBridgePayload {
  readonly toolCallId: string;
  readonly emailId?: string;
  readonly subject?: string;
  readonly body?: string;
}

export type DraftBridgeHandler = (payload: DraftBridgePayload) => void;

const noop: DraftBridgeHandler = () => {};

const DraftBridgeContext = createContext<DraftBridgeHandler>(noop);

export const DraftBridgeProvider = DraftBridgeContext.Provider;

/** Reads the draft bridge callback; defaults to a no-op outside a provider. */
export function useDraftBridge(): DraftBridgeHandler {
  return use(DraftBridgeContext);
}
