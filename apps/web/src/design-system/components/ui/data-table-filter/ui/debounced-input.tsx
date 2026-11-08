"use client";

import { useEffect, useState } from "react";
import { Input } from "@/design-system/components/ui/input";
import { useDebounceCallback } from "../hooks/use-debounce-callback";

type DebouncedInputProps = {
  value: string | number;
  onChange: (value: string | number) => void;
  debounceMs?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">;

/** Controlled input with debounced change propagation. */
export function DebouncedInput({
  value: initialValue,
  onChange,
  debounceMs = 500,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const debouncedOnChange = useDebounceCallback(onChange, debounceMs);

  /** Mirrors the input value locally and forwards a debounced change. */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedOnChange(newValue);
  };

  return <Input {...props} value={value} onChange={handleInputChange} />;
}
