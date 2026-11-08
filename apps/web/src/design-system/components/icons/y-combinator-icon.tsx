import type { SVGProps } from "react";

/** Y Combinator brand mark in its fixed orange-and-white colorway. */
export function YCombinatorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-label="Y Combinator"
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M48 48H0V8.62e-07H48V48Z" fill="#FF6600" />
      <path
        d="M13.9 11.78H17.66L22.5 21.53C23.2 22.98 23.8 24.4 23.8 24.4C23.8 24.4 24.43 23.02 25.18 21.53L30.09 11.78H33.58L25.29 27.37V37.31H22.12V27.19L13.9 11.78Z"
        fill="white"
      />
    </svg>
  );
}
