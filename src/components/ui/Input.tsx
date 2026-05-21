"use client";

import { cn } from "@/lib/utils/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground)] font-body">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "input-field",
            error && "border-nred-500 focus:ring-nred-300",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-nred-300 font-body">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
