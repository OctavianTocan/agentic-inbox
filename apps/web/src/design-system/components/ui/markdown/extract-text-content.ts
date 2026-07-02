import { isValidElement, type ReactNode } from "react";

/** Recursively extracts plain text from a React node tree. */
export function extractTextContent(children: ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join("");
  }
  if (
    isValidElement<{ children?: ReactNode }>(children) &&
    children.props.children
  ) {
    return extractTextContent(children.props.children);
  }
  return String(children ?? "");
}
