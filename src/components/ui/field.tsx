import { cn } from "../../lib/utils";
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";

/* Liquid Glass: поля как .inp в превью — плотное стекло, hairline-бордер,
   фокус подсвечивается изумрудом (--food). Радиус 14px. */

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-[14px] border border-stroke bg-glass-strong px-3.5 py-2 text-[15px] font-semibold outline-none transition-colors duration-200 placeholder:font-medium placeholder:text-muted-foreground focus:border-food disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-[14px] border border-stroke bg-glass-strong px-3.5 py-2.5 text-[15px] font-semibold outline-none transition-colors duration-200 placeholder:font-medium placeholder:text-muted-foreground focus:border-food disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-semibold text-muted-foreground select-none", className)}
      {...props}
    />
  );
}
