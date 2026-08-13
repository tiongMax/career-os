import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:translate-y-px",
        secondary:
          "border border-border bg-surface-muted text-foreground hover:border-border-strong hover:bg-surface-subtle",
        outline:
          "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
        ghost: "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        danger:
          "bg-danger text-white shadow-sm hover:bg-danger-hover active:translate-y-px",
        link: "h-auto text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "min-h-9 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        default: "min-h-10 px-4 py-2 [&_svg:not([class*='size-'])]:size-4",
        lg: "min-h-11 px-5 py-2.5 [&_svg:not([class*='size-'])]:size-4.5",
        icon: "size-10 p-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-9 p-0 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  asChild = false,
  className,
  size,
  type,
  variant,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ size, variant }), className);

  if (asChild) {
    return <Slot className={classes} {...props} />;
  }

  return <button type={type ?? "button"} className={classes} {...props} />;
}
