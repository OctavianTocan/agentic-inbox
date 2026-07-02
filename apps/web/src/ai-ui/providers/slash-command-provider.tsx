"use client";

import type React from "react";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import { useComposer } from "../composer/composer-provider";

export type SlashCommand = {
  /** Unique identifier for the command. */
  readonly id: string;
  /** Display label shown in the menu. */
  readonly label: string;
  /** Optional description shown below the label. */
  readonly description?: string;
  /** Icon element rendered before the label. */
  readonly icon?: ReactNode;
  /** Group heading for categorization in the menu. */
  readonly group?: string;
  /** Additional search terms for filtering. */
  readonly keywords?: readonly string[];
  /** Whether this command accepts text arguments after the command name. */
  readonly acceptsArgs?: boolean;
  /** Placeholder hint for the argument (e.g. "message", "new title"). */
  readonly argsPlaceholder?: string;
  /** Handler invoked when the command is selected or submitted. */
  readonly action: (args?: string) => void | Promise<void>;
};

export type SlashCommandContextValue = {
  /** Registered slash commands. */
  readonly commands: readonly SlashCommand[];
  /** Whether the slash command menu is currently visible. */
  readonly isOpen: boolean;
  /** Current filter query (text typed after `/`). */
  readonly query: string;
  /** Commands matching the current query. */
  readonly filteredCommands: readonly SlashCommand[];
  /** Currently highlighted command id for keyboard navigation. */
  readonly selectedValue: string;
  /** ID of the command currently executing, or null. */
  readonly executingCommandId: string | null;
  /** Select a command — removes the `/query` text and invokes the action. */
  onSelect(command: SlashCommand): void;
  /** Update the highlighted command (used by cmdk onValueChange). */
  setSelectedValue(value: string): void;
  /** Close the menu without selecting. */
  close(): void;
  /**
   * Called from ComposerTextField onChange to detect slash triggers.
   *
   * @param text - The current textarea value.
   * @param selectionStart - The cursor position.
   */
  updateQuery(text: string, selectionStart: number | null): void;
  /**
   * Keyboard handler to attach to the textarea.
   * Intercepts ArrowUp/Down/Enter/Escape when the menu is open.
   */
  onTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void;
  /**
   * Attempts to parse text as a slash command and execute it.
   * Returns true if a command was matched and executed, false otherwise.
   */
  tryExecuteCommand(text: string): boolean;
};

const SlashCommandContext = createContext<SlashCommandContextValue | undefined>(
  undefined,
);

/**
 * Reads slash command context. Must be used inside a `SlashCommandProvider`.
 *
 * @returns Slash command state and handlers.
 */
export function useSlashCommands(): SlashCommandContextValue {
  const context = use(SlashCommandContext);
  if (!context) {
    throw new Error(
      "useSlashCommands must be used within a SlashCommandProvider",
    );
  }
  return context;
}

/**
 * Optionally reads slash command context. Returns `undefined` when no provider
 * is present, allowing the `ComposerTextField` to work without slash commands.
 *
 * @returns Slash command context or undefined.
 */
export function useSlashCommandsOptional():
  | SlashCommandContextValue
  | undefined {
  return use(SlashCommandContext);
}

type SlashCommandProviderProps = {
  /** Available slash commands. */
  commands: readonly SlashCommand[];
  children: ReactNode;
};

const WHITESPACE_RE = /\s/;
const SLASH_COMMAND_RE = /^\s*\/(\S+)(?:\s+(.*))?$/;

type SlashQueryResult = {
  query: string;
  index: number;
};

/** Detects `/` trigger and returns the query and position, or null if not triggered. */
function detectSlashQuery(
  text: string,
  selectionStart: number | null,
): SlashQueryResult | null {
  if (selectionStart === null) {
    return null;
  }

  const textBeforeCursor = text.slice(0, selectionStart);
  const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

  if (lastSlashIndex === -1) {
    return null;
  }

  // `/` must be at start of input or preceded by whitespace
  const charBefore = textBeforeCursor[lastSlashIndex - 1];
  if (
    lastSlashIndex > 0 &&
    charBefore !== undefined &&
    !WHITESPACE_RE.test(charBefore)
  ) {
    return null;
  }

  const query = textBeforeCursor.slice(lastSlashIndex + 1);

  // Query must not contain whitespace (means user moved past the command)
  if (WHITESPACE_RE.test(query)) {
    return null;
  }

  return { query, index: lastSlashIndex };
}

/** Parses text starting with `/command [args]` (leading whitespace allowed). */
function parseSlashCommand(
  text: string,
): { commandId: string; args: string } | null {
  const match = text.match(SLASH_COMMAND_RE);
  if (!match) {
    return null;
  }
  return { commandId: match[1], args: (match[2] ?? "").trim() };
}

/** Filters commands by query using label, id, and keywords. */
function filterCommands(
  commands: readonly SlashCommand[],
  query: string,
): readonly SlashCommand[] {
  if (query === "") {
    return commands;
  }

  const lower = query.toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.id.toLowerCase().includes(lower) ||
      cmd.keywords?.some((kw) => kw.toLowerCase().includes(lower)),
  );
}

interface SlashMenuState {
  isOpen: boolean;
  query: string;
  slashIndex: number;
  selectedValue: string;
  executingCommandId: string | null;
}

type SlashMenuAction =
  | { type: "OPEN"; query: string; slashIndex: number }
  | { type: "CLOSE" }
  | { type: "RESET" }
  | { type: "SET_SELECTED"; value: string }
  | { type: "SET_EXECUTING"; commandId: string | null };

/** Reduces slash command menu state transitions. */
function slashMenuReducer(
  state: SlashMenuState,
  action: SlashMenuAction,
): SlashMenuState {
  switch (action.type) {
    case "OPEN":
      return {
        ...state,
        isOpen: true,
        query: action.query,
        slashIndex: action.slashIndex,
      };
    case "CLOSE":
      return { ...state, isOpen: false, query: "" };
    case "RESET":
      return { ...state, isOpen: false, query: "", slashIndex: -1 };
    case "SET_SELECTED":
      return { ...state, selectedValue: action.value };
    case "SET_EXECUTING":
      return { ...state, executingCommandId: action.commandId };
    default:
      return state;
  }
}

const INITIAL_SLASH_MENU_STATE: SlashMenuState = {
  isOpen: false,
  query: "",
  slashIndex: -1,
  selectedValue: "",
  executingCommandId: null,
};

/**
 * Provides slash command detection and menu state to the composer.
 * Wrap around the `Composer` component tree (must be inside `ComposerProvider`).
 *
 * @example
 * ```tsx
 * <ComposerProvider onSubmit={handleSubmit}>
 *   <SlashCommandProvider commands={commands}>
 *     <Composer>
 *       <ComposerContent>
 *         <ComposerTextField />
 *       </ComposerContent>
 *       <SlashCommandMenu />
 *     </Composer>
 *   </SlashCommandProvider>
 * </ComposerProvider>
 * ```
 */
export function SlashCommandProvider({
  commands,
  children,
}: SlashCommandProviderProps) {
  const { text, setText, focusTextarea } = useComposer();
  const [menu, dispatchMenu] = useReducer(
    slashMenuReducer,
    INITIAL_SLASH_MENU_STATE,
  );

  // Close menu when text is cleared externally (e.g. submit, programmatic clear)
  if (menu.isOpen && text.length === 0) {
    dispatchMenu({ type: "RESET" });
  }

  const filteredCommands = useMemo(
    () => filterCommands(commands, menu.query),
    [commands, menu.query],
  );

  // Fall back to the first command when the highlighted id was filtered out.
  const effectiveSelectedValue = filteredCommands.some(
    (cmd) => cmd.id === menu.selectedValue,
  )
    ? menu.selectedValue
    : (filteredCommands[0]?.id ?? "");

  const updateQuery = useCallback(
    (newText: string, selectionStart: number | null) => {
      const detected = detectSlashQuery(newText, selectionStart);
      if (detected === null) {
        dispatchMenu({ type: "RESET" });
      } else {
        dispatchMenu({
          type: "OPEN",
          query: detected.query,
          slashIndex: detected.index,
        });
      }
    },
    [],
  );

  const close = useCallback(() => {
    dispatchMenu({ type: "CLOSE" });
  }, []);

  const executeCommand = useCallback((command: SlashCommand, args?: string) => {
    const result = command.action(args);
    if (result instanceof Promise) {
      dispatchMenu({ type: "SET_EXECUTING", commandId: command.id });
      // Error handling is the command's responsibility; swallow here to avoid unhandled rejection
      result
        .catch(() => undefined)
        .finally(() =>
          dispatchMenu({ type: "SET_EXECUTING", commandId: null }),
        );
    }
  }, []);

  const onSelect = useCallback(
    (command: SlashCommand) => {
      if (command.acceptsArgs) {
        // Replace entire text with the command so it's at the start for tryExecuteCommand
        setText(`/${command.id} `);
        dispatchMenu({ type: "RESET" });
        focusTextarea();
        return;
      }

      if (menu.slashIndex !== -1) {
        const endIndex = menu.slashIndex + 1 + menu.query.length;
        const before = text.slice(0, menu.slashIndex);
        const after = text.slice(endIndex);
        setText(before + after);
      }

      dispatchMenu({ type: "RESET" });
      executeCommand(command);
      focusTextarea();
    },
    [text, menu.query, menu.slashIndex, setText, focusTextarea, executeCommand],
  );

  const tryExecuteCommand = useCallback(
    (inputText: string): boolean => {
      const parsed = parseSlashCommand(inputText);
      if (!parsed) {
        return false;
      }

      const command = commands.find(
        (cmd) => cmd.id.toLowerCase() === parsed.commandId.toLowerCase(),
      );
      if (!command) {
        return false;
      }

      if (!command.acceptsArgs && parsed.args.length > 0) {
        return false;
      }

      setText("");
      executeCommand(command, parsed.args || undefined);
      focusTextarea();
      return true;
    },
    [commands, setText, focusTextarea, executeCommand],
  );

  const setSelectedValue = useCallback(
    (value: string) => dispatchMenu({ type: "SET_SELECTED", value }),
    [],
  );

  const navigateSelection = useCallback(
    (direction: 1 | -1) => {
      const currentIndex = filteredCommands.findIndex(
        (cmd) => cmd.id === effectiveSelectedValue,
      );
      const nextIndex =
        (currentIndex + direction + filteredCommands.length) %
        filteredCommands.length;
      const nextCommand = filteredCommands[nextIndex];
      if (nextCommand) {
        dispatchMenu({ type: "SET_SELECTED", value: nextCommand.id });
      }
    },
    [filteredCommands, effectiveSelectedValue],
  );

  const confirmSelection = useCallback(() => {
    const command = filteredCommands.find(
      (cmd) => cmd.id === effectiveSelectedValue,
    );
    if (command) {
      onSelect(command);
    }
  }, [filteredCommands, effectiveSelectedValue, onSelect]);

  const onTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!menu.isOpen || filteredCommands.length === 0) {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        navigateSelection(e.key === "ArrowDown" ? 1 : -1);
        return;
      }

      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        confirmSelection();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    },
    [
      menu.isOpen,
      filteredCommands.length,
      navigateSelection,
      confirmSelection,
      close,
    ],
  );

  const contextValue: SlashCommandContextValue = useMemo(
    () => ({
      commands,
      isOpen: menu.isOpen,
      query: menu.query,
      filteredCommands,
      selectedValue: effectiveSelectedValue,
      executingCommandId: menu.executingCommandId,
      onSelect,
      setSelectedValue,
      close,
      updateQuery,
      onTextareaKeyDown,
      tryExecuteCommand,
    }),
    [
      commands,
      menu.isOpen,
      menu.query,
      menu.executingCommandId,
      filteredCommands,
      effectiveSelectedValue,
      onSelect,
      setSelectedValue,
      close,
      updateQuery,
      onTextareaKeyDown,
      tryExecuteCommand,
    ],
  );

  return (
    <SlashCommandContext.Provider value={contextValue}>
      {children}
    </SlashCommandContext.Provider>
  );
}

export { SlashCommandContext };
