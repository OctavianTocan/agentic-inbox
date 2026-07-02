import type * as React from "react";
import { cn } from "../../lib/utils";

type GridIntensity = "bold" | "subtle" | "minimal";

type GridVariant = "default" | "contained" | "floating";

type GridPattern = "dots" | "lines" | "crosshatch" | "gradient";

interface GridPageProps extends React.ComponentProps<"div"> {
  /** Visual intensity of the grid lines */
  intensity?: GridIntensity;
  /** Whether to show outer border on all sides */
  bordered?: boolean;
}

/** Full-page wrapper that frames its content with grid borders. */
function GridPage({
  className,
  intensity = "bold",
  bordered = true,
  children,
  ...props
}: GridPageProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen",
        intensity === "bold" && "bg-border",
        intensity === "subtle" && "bg-border/50",
        intensity === "minimal" && "bg-border/30",
        bordered && "p-px",
        className,
      )}
      data-intensity={intensity}
      data-slot="grid-page"
      {...props}
    >
      <div className="relative min-h-screen bg-background">{children}</div>
    </div>
  );
}

interface GridLayoutProps extends React.ComponentProps<"div"> {
  /** Visual intensity of the grid lines */
  intensity?: GridIntensity;
  /** Add outer padding to create border on all sides */
  bordered?: boolean;
}

/** Container that renders grid borders between its child cells. */
function GridLayout({
  className,
  intensity = "bold",
  bordered = false,
  ...props
}: GridLayoutProps) {
  return (
    <div
      className={cn(
        "gap-px rounded-sm",
        intensity === "bold" && "bg-border",
        intensity === "subtle" && "bg-border/50",
        intensity === "minimal" && "bg-border/30",
        bordered && "p-px",
        className,
      )}
      data-intensity={intensity}
      data-slot="grid-layout"
      {...props}
    />
  );
}

interface GridCellProps extends React.ComponentProps<"div"> {
  /** Background variant */
  variant?: GridVariant;
}

/** Content cell within a {@link GridLayout}, with its own background variant. */
function GridCell({ className, variant = "default", ...props }: GridCellProps) {
  return (
    <div
      className={cn(
        "rounded-sm",
        variant === "default" && "bg-background",
        variant === "contained" && "bg-card",
        variant === "floating" && "bg-background/95 backdrop-blur-sm",
        className,
      )}
      data-slot="grid-cell"
      data-variant={variant}
      {...props}
    />
  );
}

interface GridSpacerProps extends React.ComponentProps<"div"> {
  /** Whether to hide on smaller screens (default: true) */
  hideOnMobile?: boolean;
}

/** Empty side-column spacer cell, optionally hidden on smaller screens. */
function GridSpacer({
  className,
  hideOnMobile = true,
  ...props
}: GridSpacerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-sm bg-background",
        hideOnMobile && "max-lg:hidden",
        className,
      )}
      data-slot="grid-spacer"
      {...props}
    />
  );
}

interface GridBackgroundProps extends React.ComponentProps<"div"> {
  /** Pattern type */
  pattern?: GridPattern;
  /** Visual intensity (affects opacity) */
  intensity?: GridIntensity;
  /** Custom cell size in pixels (default: 32) */
  size?: number;
  /** Whether pattern should be animated */
  animated?: boolean;
}

/** Decorative pattern overlay (dots, lines, crosshatch, or gradient) for a grid section. */
function GridBackground({
  className,
  pattern = "dots",
  intensity = "subtle",
  size = 32,
  animated = false,
  style,
  ...props
}: GridBackgroundProps) {
  const opacityMap: Record<GridIntensity, number> = {
    bold: 0.12,
    subtle: 0.06,
    minimal: 0.03,
  };

  const opacity = opacityMap[intensity];

  const getPatternStyle = (): React.CSSProperties => {
    switch (pattern) {
      case "dots":
        return {
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: `${size}px ${size}px`,
        };
      case "lines":
        return {
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
        };
      case "crosshatch":
        return {
          backgroundImage: `
            linear-gradient(45deg, currentColor 1px, transparent 1px),
            linear-gradient(-45deg, currentColor 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
        };
      case "gradient":
        return {
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in oklch, var(--primary) 15%, transparent), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent),
            radial-gradient(ellipse 50% 30% at 0% 100%, color-mix(in oklch, var(--primary) 8%, transparent), transparent)
          `,
        };
      default:
        return {};
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 text-foreground",
        animated && "animate-pulse",
        className,
      )}
      data-intensity={intensity}
      data-pattern={pattern}
      data-slot="grid-background"
      style={{
        opacity,
        ...getPatternStyle(),
        ...style,
      }}
      {...props}
    />
  );
}

interface GridGlowProps extends React.ComponentProps<"div"> {
  /** Position of the glow */
  position?: "top" | "center" | "bottom" | "top-left" | "top-right";
  /** Color variant */
  color?: "primary" | "accent" | "muted";
  /** Intensity of the glow */
  intensity?: GridIntensity;
}

/** Decorative radial glow positioned around a grid section. */
function GridGlow({
  className,
  position = "top",
  color = "primary",
  intensity = "subtle",
  ...props
}: GridGlowProps) {
  const positionClasses: Record<string, string> = {
    top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
    "top-left": "top-0 left-0 -translate-x-1/4 -translate-y-1/4",
    "top-right": "top-0 right-0 translate-x-1/4 -translate-y-1/4",
  };

  const colorClasses: Record<string, string> = {
    primary: "from-primary/20 via-primary/5",
    accent: "from-accent/20 via-accent/5",
    muted: "from-muted-foreground/10 via-muted-foreground/3",
  };

  const sizeMap: Record<GridIntensity, string> = {
    bold: "w-[800px] h-[400px]",
    subtle: "w-[600px] h-[300px]",
    minimal: "w-[400px] h-[200px]",
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-full bg-gradient-radial to-transparent blur-3xl",
        positionClasses[position],
        colorClasses[color],
        sizeMap[intensity],
        className,
      )}
      data-slot="grid-glow"
      {...props}
    />
  );
}

interface GridSectionProps extends React.ComponentProps<"div"> {
  /** Visual intensity of the grid */
  intensity?: GridIntensity;
  /** Remove gap to next section for seamless flow */
  seamless?: boolean;
  /** Content for the center column */
  children: React.ReactNode;
}

/** Section wrapper that centers `children` in a column flanked by side spacers. */
function GridSection({
  className,
  intensity = "bold",
  seamless = false,
  children,
  ...props
}: GridSectionProps) {
  return (
    <GridLayout
      className={cn(
        "relative z-10 grid-cols-[1fr_auto_1fr] lg:grid",
        !seamless && "gap-px",
        className,
      )}
      intensity={intensity}
      {...props}
    >
      <GridSpacer className="h-full" />

      <div className="w-full lg:w-5xl">
        <GridCell className="h-full" variant="default">
          {children}
        </GridCell>
      </div>

      <GridSpacer className="h-full" />
    </GridLayout>
  );
}

interface GridSectionRawProps extends React.ComponentProps<"div"> {
  /** Visual intensity of the grid */
  intensity?: GridIntensity;
}

/** Section wrapper without the centered column; use when arranging custom grid columns. */
function GridSectionRaw({
  className,
  intensity = "bold",
  children,
  ...props
}: GridSectionRawProps) {
  return (
    <GridLayout
      className={cn(
        "relative z-10 grid-cols-[1fr_auto_1fr] lg:grid",
        className,
      )}
      intensity={intensity}
      {...props}
    >
      {children}
    </GridLayout>
  );
}

interface GridDividerProps extends React.ComponentProps<"div"> {
  /** Optional label text */
  label?: string;
}

/** Horizontal rule with an optional centered label. */
function GridDivider({ className, label, ...props }: GridDividerProps) {
  return (
    <div
      className={cn("flex items-center gap-4 py-2", className)}
      data-slot="grid-divider"
      {...props}
    >
      <div className="h-px flex-1 bg-border" />
      {label && (
        <span className="text-muted-foreground text-xs uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export {
  GridBackground,
  GridCell,
  GridDivider,
  GridGlow,
  type GridIntensity,
  GridLayout,
  GridPage,
  type GridPattern,
  GridSection,
  GridSectionRaw,
  GridSpacer,
  type GridVariant,
};
