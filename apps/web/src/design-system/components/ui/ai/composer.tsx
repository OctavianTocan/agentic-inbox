"use client";

import { m } from "motion/react";
import type React from "react";
import { useState } from "react";
import {
  ComposerAttachButton as ComposerAttachButtonPrimitive,
  ComposerAttachments as ComposerAttachmentsPrimitive,
  type ComposerAttachmentsProps,
  ComposerContent as ComposerContentPrimitive,
  type ComposerContentProps,
  ComposerEyebrow as ComposerEyebrowPrimitive,
  type ComposerEyebrowProps,
  ComposerFooter as ComposerFooterPrimitive,
  type ComposerFooterProps,
  ComposerHeader as ComposerHeaderPrimitive,
  type ComposerHeaderProps,
  Composer as ComposerPrimitive,
  type ComposerProps,
  ComposerSendButton as ComposerSendButtonPrimitive,
  type ComposerSendButtonProps,
  ComposerStopButton as ComposerStopButtonPrimitive,
  type ComposerStopButtonProps,
  ComposerTextField as ComposerTextFieldPrimitive,
  type ComposerTextFieldProps,
  ContextUsageRing as ContextUsageRingPrimitive,
} from "@/ai-ui/ui/composer";
import {
  ArrowRightIcon,
  ArrowUpIcon,
  PlusIcon,
  StopCircleIcon,
  UploadIcon,
} from "@/design-system/components/icons";
import { useIsMobile } from "@/design-system/hooks/use-mobile";

import { cn } from "../../../lib/utils";
import { buttonVariants } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

/**
 * Styled AI Composer built on headless primitives from `@/ai-ui/ui/composer`.
 *
 * @example
 * ```tsx
 * <ComposerProvider onSubmit={handleSubmit}>
 *   <Composer>
 *     <ComposerContent>
 *       <ComposerTextField placeholder="Ask anything..." />
 *     </ComposerContent>
 *     <ComposerFooter>
 *       <ComposerAttachButton />
 *       <div className="flex items-center gap-1">
 *         <ContextUsageRing />
 *         <ComposerSendButton />
 *         <ComposerStopButton />
 *       </div>
 *     </ComposerFooter>
 *   </Composer>
 * </ComposerProvider>
 * ```
 */
const Composer = ({ className, ...props }: ComposerProps) => (
  <ComposerPrimitive
    className={cn(
      "relative mx-auto flex max-w-2xl flex-col rounded-md bg-card text-card-foreground cursor-text touch-manipulation",
      "border border-border",
      "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),0_1px_2px_rgb(17_24_39/0.06),0_4px_8px_-2px_rgb(17_24_39/0.04),0_12px_24px_-8px_rgb(17_24_39/0.06)]",
      "dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06),inset_0_-1px_0_0_rgb(0_0_0/0.35),0_2px_8px_-2px_rgb(0_0_0/0.4)]",
      "transition-[box-shadow,border-color] duration-200",
      "focus-within:border-ring/60",
      "focus-within:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.7),0_1px_2px_rgb(17_24_39/0.08),0_6px_16px_-4px_rgb(17_24_39/0.07),0_18px_36px_-10px_rgb(17_24_39/0.08)]",
      "dark:focus-within:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08),inset_0_-1px_0_0_rgb(0_0_0/0.4),0_4px_16px_-4px_rgb(0_0_0/0.55)]",
      "data-[state=drag-active]:border-primary",
      className,
    )}
    {...props}
  />
);

/** Styled banner anchored above the composer (e.g. for an active context hint). */
const ComposerEyebrow = ({ className, ...props }: ComposerEyebrowProps) => (
  <ComposerEyebrowPrimitive
    className={cn(
      "absolute right-3 bottom-full left-3 rounded-t-md border-border border-t border-r border-l bg-background px-3 py-2",
      className,
    )}
    {...props}
  />
);

/** Styled header row at the top of the composer. */
const ComposerHeader = ({ className, ...props }: ComposerHeaderProps) => (
  <ComposerHeaderPrimitive
    className={cn("flex items-center gap-2 border-b px-3 py-2", className)}
    {...props}
  />
);

/** Styled main content region of the composer. */
const ComposerContent = ({ className, ...props }: ComposerContentProps) => (
  <ComposerContentPrimitive className={cn("flex-1", className)} {...props} />
);

/** Styled auto-sizing composer input; min/max height default to mobile-aware values. */
const ComposerTextField = ({
  className,
  minHeight,
  maxHeight,
  ...props
}: ComposerTextFieldProps) => {
  const isMobile = useIsMobile();
  const resolvedMinHeight = minHeight ?? (isMobile ? 56 : 76);
  const resolvedMaxHeight = maxHeight ?? (isMobile ? 140 : 200);
  return (
    <ComposerTextFieldPrimitive
      className={cn(
        "w-full resize-none border-0 bg-transparent px-4.5 pt-3.5 pb-2 text-base placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "[mask-image:linear-gradient(to_bottom,transparent_0px,black_12px,black_calc(100%-12px),transparent_100%)]",
        "overflow-y-auto scrollbar-none",
        className,
      )}
      maxHeight={resolvedMaxHeight}
      minHeight={resolvedMinHeight}
      {...props}
    />
  );
};

/** Styled footer row of the composer holding actions like attach and send. */
const ComposerFooter = ({ className, ...props }: ComposerFooterProps) => (
  <ComposerFooterPrimitive
    className={cn(
      "flex items-center justify-between gap-2 px-3 pb-2.5",
      className,
    )}
    {...props}
  />
);

/** Styled list of composer attachments with a per-item remove control. */
const ComposerAttachments = ({
  attachments,
  onRemove,
}: ComposerAttachmentsProps) => (
  <div
    className={cn(
      "[&_[data-slot=composer-attachments]]:flex [&_[data-slot=composer-attachments]]:flex-wrap [&_[data-slot=composer-attachments]]:gap-2 [&_[data-slot=composer-attachments]]:px-3.5 [&_[data-slot=composer-attachments]]:pt-3",
      "[&_[data-slot=composer-attachment]]:relative [&_[data-slot=composer-attachment]]:flex [&_[data-slot=composer-attachment]]:items-center [&_[data-slot=composer-attachment]]:gap-2 [&_[data-slot=composer-attachment]]:rounded-lg [&_[data-slot=composer-attachment]]:border [&_[data-slot=composer-attachment]]:bg-muted/50 [&_[data-slot=composer-attachment]]:px-2.5 [&_[data-slot=composer-attachment]]:py-1.5 [&_[data-slot=composer-attachment]]:text-sm",
      "[&_[data-slot=composer-attachment][data-status=uploading]]:opacity-70",
      "[&_[data-slot=composer-attachment][data-status=error]]:border-destructive/50 [&_[data-slot=composer-attachment][data-status=error]]:bg-destructive/5",
      "[&_[data-slot=composer-attachment-preview]]:h-12 [&_[data-slot=composer-attachment-preview]]:w-12 [&_[data-slot=composer-attachment-preview]]:rounded [&_[data-slot=composer-attachment-preview]]:object-cover",
      "[&_[data-slot=composer-attachment-icon]]:inline-flex",
      "[&_[data-slot=composer-attachment-info]]:flex [&_[data-slot=composer-attachment-info]]:flex-col [&_[data-slot=composer-attachment-info]]:gap-0.5",
      "[&_[data-slot=composer-attachment-name]]:max-w-[150px] [&_[data-slot=composer-attachment-name]]:truncate [&_[data-slot=composer-attachment-name]]:text-sm",
      "[&_[data-slot=composer-attachment-size]]:text-muted-foreground [&_[data-slot=composer-attachment-size]]:text-xs",
      "[&_[data-slot=composer-attachment-error]]:max-w-[150px] [&_[data-slot=composer-attachment-error]]:truncate [&_[data-slot=composer-attachment-error]]:text-destructive [&_[data-slot=composer-attachment-error]]:text-xs",
      "[&_[data-slot=composer-attachment-spinner]]:size-3.5 [&_[data-slot=composer-attachment-spinner]]:shrink-0 [&_[data-slot=composer-attachment-spinner]]:animate-spin [&_[data-slot=composer-attachment-spinner]]:text-muted-foreground",
      "[&_[data-slot=composer-attachment-remove]]:absolute [&_[data-slot=composer-attachment-remove]]:-top-1.5 [&_[data-slot=composer-attachment-remove]]:-right-1.5 [&_[data-slot=composer-attachment-remove]]:flex [&_[data-slot=composer-attachment-remove]]:h-5 [&_[data-slot=composer-attachment-remove]]:w-5 [&_[data-slot=composer-attachment-remove]]:cursor-pointer [&_[data-slot=composer-attachment-remove]]:items-center [&_[data-slot=composer-attachment-remove]]:justify-center [&_[data-slot=composer-attachment-remove]]:rounded-full [&_[data-slot=composer-attachment-remove]]:border [&_[data-slot=composer-attachment-remove]]:bg-background [&_[data-slot=composer-attachment-remove]]:text-muted-foreground [&_[data-slot=composer-attachment-remove]]:shadow-sm [&_[data-slot=composer-attachment-remove]]:transition-colors [&_[data-slot=composer-attachment-remove]]:hover:text-foreground",
    )}
  >
    <ComposerAttachmentsPrimitive
      attachments={attachments}
      onRemove={onRemove}
    />
  </div>
);

/** Composer "+" button that opens a popover menu for adding attachments. */
function ComposerPlusMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ size: "icon-sm", variant: "ghost" }),
          "text-muted-foreground max-md:size-8",
          className,
        )}
        render={<button aria-label="Attach files" type="button" />}
      >
        <PlusIcon
          className={cn(
            "size-4 transition-transform duration-150",
            open && "rotate-45",
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto min-w-[200px] p-1"
        side="top"
        sideOffset={8}
      >
        <ComposerAttachButtonPrimitive
          aria-label="Upload from computer"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
            "cursor-pointer text-popover-foreground hover:bg-accent",
          )}
          onFilesSelected={() => setOpen(false)}
        >
          <UploadIcon className="size-4" />
          Upload from computer
        </ComposerAttachButtonPrimitive>
      </PopoverContent>
    </Popover>
  );
}

/** Styled composer send button; the default icon reflects send vs. steer mode. */
const ComposerSendButton = ({
  className,
  children,
  ...props
}: ComposerSendButtonProps) => (
  <ComposerSendButtonPrimitive
    className={cn(
      buttonVariants({ size: "icon-sm", variant: "default" }),
      "transition-[opacity,transform] duration-150 ease-out max-md:size-8",
      "data-[state=disabled]:scale-95 data-[state=disabled]:opacity-60",
      className,
    )}
    {...props}
  >
    {children ??
      (({ mode }: { mode: "send" | "steer" }) =>
        mode === "steer" ? (
          <ArrowRightIcon className="size-4" />
        ) : (
          <ArrowUpIcon className="size-4" />
        ))}
  </ComposerSendButtonPrimitive>
);

/** Styled composer button that interrupts an in-progress response. */
const ComposerStopButton = ({
  className,
  children,
  ...props
}: ComposerStopButtonProps) => (
  <ComposerStopButtonPrimitive
    className={cn(
      buttonVariants({ size: "icon-sm", variant: "outline" }),
      "max-md:size-8",
      className,
    )}
    {...props}
  >
    {children ?? <StopCircleIcon className="size-4" />}
  </ComposerStopButtonPrimitive>
);

/**
 * Animated composer wrapper with a spring layout transition.
 * Use when the composer moves between positions (e.g. center to bottom).
 */
const ComposerMotionRoot = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof m.div>) => (
  <m.div
    className={cn("mx-auto w-full max-w-2xl", className)}
    layout="position"
    layoutId="prompt-input"
    transition={{ type: "spring", stiffness: 300, damping: 35 }}
    {...props}
  >
    {children}
  </m.div>
);

/**
 * Context usage ring wrapped in a tooltip showing the percentage.
 * Renders nothing when usage data is unavailable.
 */
function ContextUsageRing({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "[&_[data-slot=context-usage-track]]:stroke-muted [&_[data-slot=context-usage-fill]]:stroke-primary",
            className,
          )}
          render={<span />}
        >
          <ContextUsageRingPrimitive />
        </TooltipTrigger>
        <TooltipContent>Context usage</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export {
  Composer,
  ComposerAttachments,
  type ComposerAttachmentsProps,
  ComposerContent,
  type ComposerContentProps,
  ComposerEyebrow,
  type ComposerEyebrowProps,
  ComposerFooter,
  type ComposerFooterProps,
  ComposerHeader,
  type ComposerHeaderProps,
  ComposerMotionRoot,
  ComposerPlusMenu,
  type ComposerProps,
  ComposerSendButton,
  type ComposerSendButtonProps,
  ComposerStopButton,
  type ComposerStopButtonProps,
  ComposerTextField,
  type ComposerTextFieldProps,
  ContextUsageRing,
};
