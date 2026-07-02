"use client";

import type * as React from "react";
import { MinusIcon } from "@/design-system/components/icons";

/** Visual separator between OTP input groups. */
function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className="flex items-center [&_svg:not([class*='size-'])]:size-4"
      data-slot="input-otp-separator"
      {...props}
    >
      <MinusIcon />
    </div>
  );
}

export { InputOTPSeparator };
