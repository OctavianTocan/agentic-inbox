/**
 * HybridDialog - A responsive dialog/drawer component that adapts to screen size
 * Supports both controlled and uncontrolled open state that persists across resize
 * Copied from https://credenza.rdev.pro/ -- but with some modifications
 */

"use client";

import { createContext, use, useCallback, useMemo, useState } from "react";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

type HybridDialogRootProps = React.ComponentProps<typeof Dialog> &
  React.ComponentProps<typeof Drawer>;
type HybridDialogTriggerProps = React.ComponentProps<typeof DialogTrigger> &
  React.ComponentProps<typeof DrawerTrigger>;
type HybridDialogCloseProps = React.ComponentProps<typeof DialogClose> &
  React.ComponentProps<typeof DrawerClose>;
type HybridDialogContentProps = React.ComponentProps<typeof DialogContent> &
  React.ComponentProps<typeof DrawerContent>;
type HybridDialogDescriptionProps = React.ComponentProps<
  typeof DialogDescription
> &
  React.ComponentProps<typeof DrawerDescription>;
type HybridDialogHeaderProps = React.ComponentProps<typeof DialogHeader> &
  React.ComponentProps<typeof DrawerHeader>;
type HybridDialogTitleProps = React.ComponentProps<typeof DialogTitle> &
  React.ComponentProps<typeof DrawerTitle>;
type HybridDialogFooterProps = React.ComponentProps<typeof DialogFooter> &
  React.ComponentProps<typeof DrawerFooter>;

const HybridDialogContext = createContext<{ isMobile: boolean }>({
  isMobile: false,
});

/** Reads the hybrid dialog context, throwing when used outside its provider. */
const useHybridDialogContext = () => {
  const context = use(HybridDialogContext);
  if (!context) {
    throw new Error(
      "HybridDialog components cannot be rendered outside the HybridDialog Context",
    );
  }
  return context;
};

/** Dialog that renders as a modal on desktop and a drawer on mobile, supporting controlled and uncontrolled open state. */
const HybridDialog = ({
  children,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: HybridDialogRootProps) => {
  const isMobile = useIsMobile();
  const DialogComponent = isMobile ? Drawer : Dialog;

  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);

  const currentOpen = isControlled ? open : internalOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange?.(newOpen);

      if (!isControlled) {
        setInternalOpen(newOpen);
      }
    },
    [isControlled, onOpenChange],
  );

  return (
    <HybridDialogContext.Provider
      value={useMemo(() => ({ isMobile }), [isMobile])}
    >
      <DialogComponent
        onOpenChange={handleOpenChange}
        open={currentOpen}
        {...props}
      >
        {children}
      </DialogComponent>
    </HybridDialogContext.Provider>
  );
};

/** Element that opens the hybrid dialog. */
const HybridDialogTrigger = (props: HybridDialogTriggerProps) => {
  const { isMobile } = useHybridDialogContext();
  const Component = isMobile ? DrawerTrigger : DialogTrigger;
  return <Component {...props} />;
};

/** Element that closes the hybrid dialog. */
const HybridDialogClose = (props: HybridDialogCloseProps) => {
  const { isMobile } = useHybridDialogContext();
  const Component = isMobile ? DrawerClose : DialogClose;
  return <Component {...props} />;
};

/** Surface containing the hybrid dialog's header, body, and footer. */
const HybridDialogContent = ({
  className,
  children,
  ...props
}: HybridDialogContentProps) => {
  const { isMobile } = useHybridDialogContext();
  const Component = isMobile ? DrawerContent : DialogContent;
  return (
    <Component
      className={cn(
        "group/hybrid-content flex flex-col gap-0 overflow-hidden p-0",
        "sm:max-w-lg md:max-h-[min(85dvh,720px)]",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

/** Supporting description text of the hybrid dialog. */
const HybridDialogDescription = (props: HybridDialogDescriptionProps) => {
  const { isMobile } = useHybridDialogContext();
  const Component = isMobile ? DrawerDescription : DialogDescription;
  return <Component {...props} />;
};

/** Header region of the hybrid dialog. */
const HybridDialogHeader = ({
  className,
  ...props
}: HybridDialogHeaderProps) => {
  const { isMobile } = useHybridDialogContext();
  const Component = isMobile ? DrawerHeader : DialogHeader;
  return (
    <Component
      className={cn(
        "shrink-0 gap-1 p-4 text-left md:pr-10",
        "group-has-[[data-slot=dialog-body]]/hybrid-content:pb-0",
        "group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left",
        "group-data-[vaul-drawer-direction=top]/drawer-content:text-left",
        className,
      )}
      {...props}
    />
  );
};

/** Accessible title of the hybrid dialog. */
const HybridDialogTitle = (props: HybridDialogTitleProps) => {
  const { isMobile } = useHybridDialogContext();
  const Component = isMobile ? DrawerTitle : DialogTitle;
  return <Component {...props} />;
};

type HybridDialogBodyProps = React.HTMLAttributes<HTMLDivElement>;

/** Scrollable body region of the hybrid dialog. */
const HybridDialogBody = ({ className, ...props }: HybridDialogBodyProps) => (
  <div
    className={cn("min-h-0 flex-1 overflow-y-auto p-4", className)}
    data-slot="dialog-body"
    {...props}
  />
);

/** Footer region holding the hybrid dialog's action buttons. */
const HybridDialogFooter = ({
  className,
  ...props
}: HybridDialogFooterProps) => {
  const { isMobile } = useHybridDialogContext();
  const Component = isMobile ? DrawerFooter : DialogFooter;
  return (
    <Component
      className={cn(
        "mx-0 mt-0 mb-0 shrink-0 flex-col-reverse gap-2 border-t bg-muted/50 p-4",
        "pb-[max(1rem,env(safe-area-inset-bottom))]",
        "sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
};

export {
  HybridDialog,
  HybridDialogBody,
  HybridDialogClose,
  HybridDialogContent,
  HybridDialogDescription,
  HybridDialogFooter,
  HybridDialogHeader,
  HybridDialogTitle,
  HybridDialogTrigger,
};
