"use client";

import type { SlashCommand } from "@/ai-ui/providers/slash-command-provider";
import { useSlashCommands } from "@/ai-ui/providers/slash-command-provider";

import { cn } from "../../../lib/utils";
import { Command, CommandGroup, CommandItem, CommandList } from "../command";

type SlashCommandMenuProps = {
  className?: string;
};

/**
 * Floating command menu that appears when the user types `/` in the composer.
 * Positioned absolutely above the parent Composer (which has `position: relative`).
 *
 * Must be placed inside a `SlashCommandProvider`.
 *
 * @example
 * ```tsx
 * <SlashCommandProvider commands={commands}>
 *   <Composer>
 *     <ComposerContent>
 *       <ComposerTextField />
 *     </ComposerContent>
 *     <SlashCommandMenu />
 *   </Composer>
 * </SlashCommandProvider>
 * ```
 */
export function SlashCommandMenu({ className }: SlashCommandMenuProps) {
  const {
    isOpen,
    filteredCommands,
    selectedValue,
    setSelectedValue,
    onSelect,
  } = useSlashCommands();

  if (!isOpen || filteredCommands.length === 0) {
    return null;
  }

  const grouped = groupCommands(filteredCommands);

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 z-50 mb-2 w-full rounded-lg bg-popover shadow-md ring-1 ring-foreground/10",
        className,
      )}
      data-slot="slash-command-menu"
    >
      <Command
        className="rounded-lg!"
        loop
        shouldFilter={false}
        value={selectedValue}
        onValueChange={setSelectedValue}
      >
        <CommandList>
          {grouped.map(({ group, commands }) => (
            <CommandGroup
              heading={group ?? undefined}
              key={group ?? "__ungrouped"}
            >
              {commands.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => onSelect(command)}
                  value={command.id}
                >
                  <span className="text-sm font-semibold">/</span>
                  <span className="text-sm">{command.id}</span>
                  {command.acceptsArgs && command.argsPlaceholder && (
                    <span className="text-muted-foreground text-xs italic">
                      {command.argsPlaceholder}
                    </span>
                  )}
                  {command.description && (
                    <span className="text-muted-foreground text-xs">
                      {command.description}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}

type GroupedCommands = {
  group: string | null;
  commands: readonly SlashCommand[];
};

/** Groups commands by their `group` field, preserving insertion order. */
function groupCommands(
  commands: readonly SlashCommand[],
): readonly GroupedCommands[] {
  const map = new Map<string | null, SlashCommand[]>();

  for (const command of commands) {
    const key = command.group ?? null;
    const existing = map.get(key);
    if (existing) {
      existing.push(command);
    } else {
      map.set(key, [command]);
    }
  }

  return Array.from(map.entries()).map(([group, cmds]) => ({
    group,
    commands: cmds,
  }));
}
