import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg:last-child]:translate-x-0.5",
  {
    variants: {
      variant: {
        // CareerOS primary — brand gradient with animated glow lift
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        destructive:
          "bg-danger text-white shadow-sm transition-all duration-250 hover:-translate-y-[1px] hover:brightness-110 hover:shadow-[0_10px_28px_-8px_#EF444488,0_0_0_1px_#EF444455]",
        success:
          "bg-success text-white shadow-sm transition-all duration-250 hover:-translate-y-[1px] hover:brightness-110 hover:shadow-[0_10px_28px_-8px_#22C55E88,0_0_0_1px_#22C55E55]",
        outline:
          "border border-border bg-transparent text-foreground transition-all duration-250 hover:-translate-y-[1px] hover:bg-elevated hover:border-primary/40 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_25%,transparent),0_8px_24px_-10px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
        secondary:
          "bg-elevated text-foreground border border-border transition-all duration-250 hover:-translate-y-[1px] hover:bg-card hover:border-primary/30 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_20%,transparent)]",
        ghost: "text-foreground/80 hover:bg-elevated hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 rounded-md px-3.5 text-[13px]",
        lg: "h-12 rounded-lg px-6 text-[15px]",
        xl: "h-14 rounded-xl px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
