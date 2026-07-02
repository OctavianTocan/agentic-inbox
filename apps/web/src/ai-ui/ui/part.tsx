"use client";

import type * as React from "react";

/** Headless root container for a multi-section part. */
export interface PartProps extends React.ComponentProps<"div"> {}

function Part({ className, children, ...props }: PartProps) {
  return (
    <div className={className} data-slot="part" {...props}>
      {children}
    </div>
  );
}

/** Headless header row for a part. */
export interface PartHeaderProps extends React.ComponentProps<"div"> {}

function PartHeader({ className, children, ...props }: PartHeaderProps) {
  return (
    <div className={className} data-slot="part-header" {...props}>
      {children}
    </div>
  );
}

/** Headless icon slot within a part header. */
export interface PartIconProps extends React.ComponentProps<"div"> {}

function PartIcon({ className, children, ...props }: PartIconProps) {
  return (
    <div className={className} data-slot="part-icon" {...props}>
      {children}
    </div>
  );
}

/** Headless title element for a part. */
export interface PartTitleProps extends React.ComponentProps<"h3"> {}

function PartTitle({ className, children, ...props }: PartTitleProps) {
  return (
    <h3 className={className} data-slot="part-title" {...props}>
      {children}
    </h3>
  );
}

/** Headless content area for a part. */
export interface PartContentProps extends React.ComponentProps<"div"> {}

function PartContent({ className, children, ...props }: PartContentProps) {
  return (
    <div className={className} data-slot="part-content" {...props}>
      {children}
    </div>
  );
}

/** Headless footer row for a part. */
export interface PartFooterProps extends React.ComponentProps<"div"> {}

function PartFooter({ className, children, ...props }: PartFooterProps) {
  return (
    <div className={className} data-slot="part-footer" {...props}>
      {children}
    </div>
  );
}

/** Headless actions container, typically placed inside a part footer. */
export interface PartActionsProps extends React.ComponentProps<"div"> {}

function PartActions({ className, children, ...props }: PartActionsProps) {
  return (
    <div className={className} data-slot="part-actions" {...props}>
      {children}
    </div>
  );
}

export {
  Part,
  PartActions,
  PartContent,
  PartFooter,
  PartHeader,
  PartIcon,
  PartTitle,
};
