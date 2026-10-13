import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, title, description, children, className }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className={cn("glass max-h-[90vh] overflow-y-auto border-border text-right sm:max-w-lg", className)}>
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: { title: string; subtitle?: string; icon: LucideIcon; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, icon: Icon, tone = "primary" }: { label: string; value: string; icon: LucideIcon; tone?: "primary" | "accent" | "destructive" | "muted" }) {
  const tones = { primary: "bg-primary/15 text-primary", accent: "bg-accent/15 text-accent", destructive: "bg-destructive/15 text-destructive", muted: "bg-muted text-muted-foreground" };
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", tones[tone])}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 truncate text-lg font-extrabold sm:text-xl">{value}</div>
    </div>
  );
}

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export const selectCls = "h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
export const tableWrap = "glass overflow-x-auto rounded-2xl";
export const th = "whitespace-nowrap px-3 py-3 text-right text-xs font-semibold text-muted-foreground";
export const td = "whitespace-nowrap px-3 py-2.5 text-sm";

export function Badge({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "accent" | "destructive" | "muted" }) {
  const tones = { primary: "bg-primary/15 text-primary", accent: "bg-accent/15 text-accent", destructive: "bg-destructive/15 text-destructive", muted: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}
