import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      expand
      visibleToasts={4}
      duration={4200}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-border bg-elevated/95 px-4 py-3 text-foreground shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl data-[type=success]:border-success/40 data-[type=error]:border-danger/40 data-[type=warning]:border-warning/40",
          title: "font-display text-[13px] font-semibold tracking-tight",
          description: "text-[12px] text-muted-foreground",
          actionButton:
            "group-[.toast]:h-8 group-[.toast]:rounded-md group-[.toast]:bg-primary group-[.toast]:px-3 group-[.toast]:text-[12px] group-[.toast]:font-medium group-[.toast]:text-primary-foreground group-[.toast]:transition-colors hover:group-[.toast]:bg-primary-hover",
          cancelButton:
            "group-[.toast]:h-8 group-[.toast]:rounded-md group-[.toast]:border group-[.toast]:border-border group-[.toast]:bg-card group-[.toast]:px-3 group-[.toast]:text-[12px] group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:border-border group-[.toast]:bg-card group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
