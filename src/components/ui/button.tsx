import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import type { ButtonHTMLAttributes } from "react";

/* Liquid Glass: primary — вертикальный градиент роли с цветной тенью,
   как .go.food в превью; нажатие «пружинит» (active:scale-95). */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-[transform,filter] duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--food)_86%,#fff),var(--food))] shadow-[0_10px_24px_rgba(16,185,129,0.4)] text-white hover:brightness-105",
        secondary: "glass-strong border border-stroke text-foreground hover:brightness-105",
        outline: "border border-stroke bg-transparent text-foreground hover:bg-glass",
        ghost: "text-foreground hover:bg-glass",
        destructive: "bg-destructive text-white hover:brightness-110",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-14 px-6 text-base",
        icon: "h-10 w-10",
      },
      /** Роль цвета primary-кнопки: еда (изумруд) или сон (синий). */
      tone: {
        food: "",
        sleep: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        tone: "sleep",
        class:
          "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--sleep)_88%,#fff),var(--sleep))] shadow-[0_10px_24px_rgba(28,144,237,0.4)]",
      },
    ],
    defaultVariants: { variant: "default", size: "default", tone: "food" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  tone,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, tone }), className)} {...props} />;
}

export { buttonVariants };
