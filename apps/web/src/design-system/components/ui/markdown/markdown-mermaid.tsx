"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Maximize2Icon } from "@/design-system/components/icons";
import { useDebounce } from "../../../hooks/use-debounce";
import { cn } from "../../../lib/utils";
import { useTheme } from "../../../providers/theme";
import { Button } from "../button";
import { ButtonGroup } from "../button-group";
import { CodeView } from "../code-view/code-view";
import { CopyButton } from "../copy-button";
import {
  type MarkdownMediaContentSize,
  MarkdownMediaViewer,
} from "./markdown-media-viewer";

/** Hashes a string into a short hex digest for stable diagram ids. */
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

type RenderState =
  | { kind: "pending" }
  | { kind: "ready"; svg: string }
  | { kind: "error" };

export type MermaidDiagramProps = {
  code: string;
  className?: string;
};

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
let initializedTheme: "dark" | "light" | null = null;

/** Builds mermaid theme variables matching the app palette for a color scheme. */
function getMermaidThemeVariables(isDark: boolean) {
  const palette = isDark
    ? {
        accent: "#7c7ff3",
        background: "#292827",
        border: "#41403d",
        card: "#383734",
        foreground: "#fafaf8",
        muted: "#302f2d",
        mutedForeground: "#aaa8a4",
        secondary: "#2f6159",
      }
    : {
        accent: "#36322f",
        background: "#fafaf8",
        border: "#e4e1dc",
        card: "#ffffff",
        foreground: "#242321",
        muted: "#f2f0ec",
        mutedForeground: "#73706b",
        secondary: "#e8f5f2",
      };

  return {
    actorBkg: palette.card,
    actorBorder: palette.border,
    actorTextColor: palette.foreground,
    background: palette.background,
    clusterBkg: palette.muted,
    clusterBorder: palette.border,
    edgeLabelBackground: "transparent",
    fontFamily: "var(--font-family-sans)",
    labelBackground: "transparent",
    lineColor: palette.mutedForeground,
    mainBkg: palette.card,
    nodeBorder: palette.border,
    noteBkgColor: palette.muted,
    noteBorderColor: palette.border,
    noteTextColor: palette.foreground,
    primaryBorderColor: palette.accent,
    primaryColor: palette.card,
    primaryTextColor: palette.foreground,
    secondaryBorderColor: palette.border,
    secondaryColor: palette.muted,
    secondaryTextColor: palette.foreground,
    tertiaryBorderColor: palette.border,
    tertiaryColor: palette.secondary,
    tertiaryTextColor: palette.foreground,
    textColor: palette.foreground,
    titleColor: palette.foreground,
    transitionColor: palette.accent,
  };
}

/** Parses a positive pixel length from an SVG dimension attribute. */
function parseSvgLength(value: string | null): number | undefined {
  if (!value || value.includes("%")) {
    return;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return;
  }

  return parsed;
}

/** Parses width and height from an SVG `viewBox` attribute. */
function parseViewBox(
  value: string | null,
): MarkdownMediaContentSize | undefined {
  if (!value) {
    return;
  }

  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const width = parts.at(2);
  const height = parts.at(3);

  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return;
  }

  return { width, height };
}

/** Resolves the intrinsic size of rendered SVG markup, if determinable. */
function getSvgContentSize(svg: string): MarkdownMediaContentSize | undefined {
  if (typeof DOMParser === "undefined") {
    return;
  }

  const svgDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
  const svgElement = svgDocument.documentElement;
  const viewBoxSize = parseViewBox(svgElement.getAttribute("viewBox"));
  if (viewBoxSize) {
    return viewBoxSize;
  }

  const width = parseSvgLength(svgElement.getAttribute("width"));
  const height = parseSvgLength(svgElement.getAttribute("height"));
  if (!width || !height) {
    return;
  }

  return { width, height };
}

/** Appends a CSS declaration to an existing inline style string. */
function appendInlineStyle(
  currentStyle: string | null,
  declaration: string,
): string {
  return currentStyle ? `${currentStyle}; ${declaration}` : declaration;
}

/** Returns the SVG markup with edge-label backgrounds forced transparent. */
function getSvgWithTransparentEdgeLabels(svg: string): string {
  if (
    typeof DOMParser === "undefined" ||
    typeof XMLSerializer === "undefined"
  ) {
    return svg;
  }

  const svgDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
  const svgElement = svgDocument.documentElement;
  const edgeLabelBackgroundSelector = [
    ".labelBkg",
    ".edgeLabel rect",
    ".edgeLabel .label rect",
  ].join(", ");
  const edgeLabelSurfaceSelector = [
    ".edgeLabel",
    ".edgeLabel foreignObject",
    ".edgeLabel .label",
    ".edgeLabel .label span",
    ".edgeLabel div",
    ".edgeLabel p",
    ".edgeLabel span",
  ].join(", ");

  for (const element of svgDocument.querySelectorAll(
    edgeLabelBackgroundSelector,
  )) {
    element.setAttribute("fill", "transparent");
    element.setAttribute("stroke", "transparent");
    element.setAttribute(
      "style",
      appendInlineStyle(
        element.getAttribute("style"),
        "background: transparent; background-color: transparent; fill: transparent; stroke: transparent",
      ),
    );
  }

  for (const element of svgDocument.querySelectorAll(
    edgeLabelSurfaceSelector,
  )) {
    element.setAttribute(
      "style",
      appendInlineStyle(
        element.getAttribute("style"),
        "background: transparent; background-color: transparent",
      ),
    );
  }

  return new XMLSerializer().serializeToString(svgElement);
}

/** Loads and initializes mermaid for the given color scheme. */
function getMermaid(isDark: boolean) {
  const theme: "dark" | "light" = isDark ? "dark" : "light";
  if (!mermaidPromise || initializedTheme !== theme) {
    initializedTheme = theme;
    mermaidPromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "strict",
        fontFamily: "var(--font-family-sans)",
        themeVariables: getMermaidThemeVariables(isDark),
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/** Renders sanitised SVG markup inside a div. */
function SvgContainer({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
    }
  }, [html]);
  return <div className={className} ref={ref} />;
}

/** Renders a mermaid source block as a themed, zoomable diagram. */
function MermaidDiagramInner({ code, className }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const debouncedCode = useDebounce(code, 250);
  const [state, setState] = useState<RenderState>({ kind: "pending" });
  const [open, setOpen] = useState(false);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const id = `mermaid-${reactId}-${fnv1aHex(debouncedCode)}-${isDark ? "d" : "l"}`;
  const contentSize = useMemo(() => {
    if (state.kind !== "ready") {
      return;
    }

    return getSvgContentSize(state.svg);
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    /** Parses and renders the mermaid source into SVG. */
    async function run() {
      const trimmed = debouncedCode.trim();
      if (!trimmed) {
        if (!cancelled) {
          setState({ kind: "pending" });
        }
        return;
      }

      try {
        const mermaid = await getMermaid(isDark);
        if (cancelled) {
          return;
        }

        const parsed = await mermaid.parse(trimmed, { suppressErrors: true });
        if (cancelled) {
          return;
        }
        if (!parsed) {
          setState({ kind: "error" });
          return;
        }

        const { svg } = await mermaid.render(id, trimmed);
        if (cancelled) {
          return;
        }
        setState({ kind: "ready", svg: getSvgWithTransparentEdgeLabels(svg) });
      } catch {
        if (!cancelled) {
          setState({ kind: "error" });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedCode, isDark, id]);

  const handleOpen = useCallback(() => setOpen(true), []);

  if (state.kind !== "ready") {
    return (
      <CodeView
        className={cn("not-prose", className)}
        code={code}
        language="mermaid"
        lineNumbers={false}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "group/mermaid not-prose relative my-4 overflow-hidden rounded-xl bg-muted/35 p-2 shadow-xs ring-1 ring-border/70",
          className,
        )}
        data-slot="markdown-mermaid"
      >
        <button
          aria-label="Open diagram in zoom view"
          className="block w-full cursor-zoom-in rounded-lg bg-card p-5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
          data-slot="markdown-mermaid-trigger"
          onClick={handleOpen}
          type="button"
        >
          <SvgContainer
            className="mermaid-svg flex w-full justify-center [&>svg]:h-auto [&>svg]:max-w-full"
            html={state.svg}
          />
        </button>
        <ButtonGroup
          aria-label="Diagram actions"
          className="absolute top-3 right-3 rounded-lg bg-background/95 opacity-0 shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-opacity group-focus-within/mermaid:opacity-100 group-hover/mermaid:opacity-100"
        >
          <Button
            aria-label="Open diagram in zoom view"
            onClick={handleOpen}
            size="icon-sm"
            variant="ghost"
          >
            <Maximize2Icon className="size-4" />
          </Button>
          <CopyButton
            aria-label="Copy diagram source"
            size="icon-sm"
            value={code}
            variant="ghost"
          />
        </ButtonGroup>
      </div>
      <MarkdownMediaViewer
        contentSize={contentSize}
        copyValue={code}
        mediaClassName="mermaid-modal-svg [&>svg]:size-full [&>svg]:max-w-none"
        onOpenChange={setOpen}
        open={open}
        title="Diagram"
      >
        <SvgContainer className="size-full" html={state.svg} />
      </MarkdownMediaViewer>
    </>
  );
}

/** Renders a mermaid source block as a themed, zoomable diagram. */
export const MermaidDiagram = memo(MermaidDiagramInner);
