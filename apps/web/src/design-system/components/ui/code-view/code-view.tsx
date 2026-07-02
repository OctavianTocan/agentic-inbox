"use client";

import {
  type FileContents,
  type FileDiffMetadata,
  registerCustomTheme,
} from "@pierre/diffs";
import {
  File as PierreFile,
  FileDiff as PierreFileDiff,
  MultiFileDiff as PierreMultiFileDiff,
  WorkerPoolContextProvider,
} from "@pierre/diffs/react";
import type { CSSProperties, ReactNode } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "../../../hooks/use-copy-to-clipboard";
import { cn } from "../../../lib/utils";
import { useTheme } from "../../../providers/theme";
import { CopyButton } from "../copy-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

registerCustomTheme("comcom-dark", async () => {
  const githubTheme = (await import("@shikijs/themes/github-dark-default"))
    .default;
  const cursor = (await import("./cursor-dark.json")).default;
  return {
    ...githubTheme,
    name: "comcom-dark",
    type: "dark" as const,
    colors: { ...githubTheme.colors, ...cursor.colors },
  };
});

registerCustomTheme("comcom-light", async () => {
  const githubTheme = (await import("@shikijs/themes/github-light-default"))
    .default;
  const cursor = (await import("./cursor-light.json")).default;
  return {
    ...githubTheme,
    name: "comcom-light",
    type: "light" as const,
    colors: { ...githubTheme.colors, ...cursor.colors },
  };
});

const defaultTheme = {
  dark: "comcom-dark" as const,
  light: "comcom-light" as const,
};

const workerPoolProps = {
  poolOptions: {
    // jsdom and SSR lack Worker; an empty pool keeps initialization from
    // rejecting and falls back to plain-text rendering on the main thread.
    ...(typeof Worker === "undefined" ? { poolSize: 0 } : {}),
    workerFactory: () =>
      new Worker(
        new URL("@pierre/diffs/worker/worker-portable.js", import.meta.url),
        {
          type: "module",
        },
      ),
  },
  highlighterOptions: { theme: defaultTheme },
};

/** Resolve the active theme to the value Pierre's renderer expects. */
function usePierreThemeType(): "dark" | "light" | "system" {
  const { resolvedTheme } = useTheme();
  if (resolvedTheme === "dark" || resolvedTheme === "light")
    return resolvedTheme;
  return "system";
}

const codeViewStyle = {
  "--diffs-font-size": "12px",
  "--diffs-line-height": "18px",
  "--diffs-gap-inline": "0.75rem",
  "--diffs-gap-block": "0.75rem",
} as CSSProperties;

const noLineNumbersCSS = `[data-line] { padding-inline: 0.75rem !important; }`;

export interface CodeViewProps {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  copyButton?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Read-only, syntax-highlighted view of a single code snippet. */
export function CodeView({
  code,
  language = "text",
  lineNumbers = true,
  copyButton = true,
  className,
  style,
}: CodeViewProps) {
  const themeType = usePierreThemeType();
  return (
    <div
      className={cn(
        "group/code-view relative w-full overflow-hidden rounded-md border border-border",
        className,
      )}
      style={{ ...codeViewStyle, ...style }}
    >
      <WorkerPoolContextProvider {...workerPoolProps}>
        <PierreFile
          file={{ name: `file.${language}`, contents: code, lang: language }}
          options={{
            theme: defaultTheme,
            themeType,
            disableFileHeader: true,
            disableLineNumbers: !lineNumbers,
            unsafeCSS: lineNumbers ? undefined : noLineNumbersCSS,
          }}
        />
      </WorkerPoolContextProvider>
      {copyButton && (
        <CopyButton
          className="absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover/code-view:opacity-100"
          size="icon-sm"
          value={code}
          variant="ghost"
        />
      )}
    </div>
  );
}

export interface FileViewProps {
  name: string;
  code: string;
  language?: string;
  lineNumbers?: boolean;
  copyButton?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Highlighted view of a named file, with a sticky copyable path header. */
export function FileView({
  name,
  code,
  language,
  lineNumbers = true,
  copyButton = true,
  className,
  style,
}: FileViewProps) {
  const themeType = usePierreThemeType();
  return (
    <div
      className={cn(
        "group/code-view relative overflow-y-auto overflow-x-hidden rounded-lg border border-border",
        className,
      )}
      style={{ ...codeViewStyle, ...style }}
    >
      <FileHeader code={code} copyButton={copyButton} name={name} />
      <WorkerPoolContextProvider {...workerPoolProps}>
        <PierreFile
          file={{ name, contents: code, lang: language }}
          options={{
            theme: defaultTheme,
            themeType,
            disableFileHeader: true,
            disableLineNumbers: !lineNumbers,
            unsafeCSS: lineNumbers ? undefined : noLineNumbersCSS,
          }}
        />
      </WorkerPoolContextProvider>
    </div>
  );
}

/** Sticky header showing the file path, copyable on click. */
function FileHeader({
  name,
  code,
  copyButton,
}: {
  name: string;
  code: string;
  copyButton: boolean;
}) {
  const { copy } = useCopyToClipboard();

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-border border-b bg-background py-1 pr-1.5 pl-3 font-mono text-xs">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={`Copy path: ${name}`}
              className="block min-w-0 flex-1 cursor-pointer truncate text-left text-muted-foreground transition-colors hover:text-foreground"
              onClick={async () => {
                if (await copy(name)) {
                  toast.success("Path copied", { description: name });
                }
              }}
              type="button"
            />
          }
        >
          {name}
        </TooltipTrigger>
        <TooltipContent align="start" side="top">
          {name}
        </TooltipContent>
      </Tooltip>
      {copyButton && (
        <CopyButton
          className="shrink-0 opacity-0 transition-opacity group-hover/code-view:opacity-100"
          size="icon-sm"
          value={code}
          variant="ghost"
        />
      )}
    </div>
  );
}

export interface DiffViewProps {
  oldFile: FileContents;
  newFile: FileContents;
  diffStyle?: "unified" | "split";
  lineNumbers?: boolean;
  className?: string;
  style?: CSSProperties;
  renderHeaderMetadata?: (fileDiff: FileDiffMetadata) => ReactNode;
}

/** Side-by-side or unified diff between two file revisions. */
export function DiffView({
  oldFile,
  newFile,
  diffStyle = "unified",
  lineNumbers = true,
  className,
  style,
  renderHeaderMetadata,
}: DiffViewProps) {
  const themeType = usePierreThemeType();
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className,
      )}
      style={{ ...codeViewStyle, ...style }}
    >
      <WorkerPoolContextProvider {...workerPoolProps}>
        <PierreMultiFileDiff
          oldFile={oldFile}
          newFile={newFile}
          options={{
            theme: defaultTheme,
            themeType,
            diffStyle,
            disableLineNumbers: !lineNumbers,
          }}
          renderHeaderMetadata={renderHeaderMetadata}
        />
      </WorkerPoolContextProvider>
    </div>
  );
}

export interface PatchDiffViewProps {
  fileDiff: FileDiffMetadata;
  diffStyle?: "unified" | "split";
  lineNumbers?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Renders a diff from precomputed patch metadata for a single file. */
export function PatchDiffView({
  fileDiff,
  diffStyle = "unified",
  lineNumbers = true,
  className,
  style,
}: PatchDiffViewProps) {
  const themeType = usePierreThemeType();
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className,
      )}
      style={{ ...codeViewStyle, ...style }}
    >
      <WorkerPoolContextProvider {...workerPoolProps}>
        <PierreFileDiff
          fileDiff={fileDiff}
          options={{
            theme: defaultTheme,
            themeType,
            diffStyle,
            disableLineNumbers: !lineNumbers,
          }}
        />
      </WorkerPoolContextProvider>
    </div>
  );
}
