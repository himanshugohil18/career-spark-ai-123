import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-normal cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg:last-child]:translate-x-0.5",
  {
    variants: {
      variant: {
        // Primary — bold, high contrast, confident
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-pressed",
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-pressed",
        destructive:
          "bg-danger text-danger-foreground shadow-sm hover:brightness-95 active:brightness-90",
        success:
          "bg-success text-success-foreground shadow-sm hover:brightness-95 active:brightness-90",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/50 hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover active:bg-secondary-pressed",
        ghost: "text-muted-foreground hover:bg-elevated hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 rounded px-3.5 text-[13px]",
        lg: "h-12 rounded-md px-6 text-[15px]",
        xl: "h-14 rounded-md px-7 text-base",
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
