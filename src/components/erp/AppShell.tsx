import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, Boxes, ReceiptText, Settings, ShoppingCart, Truck, Users, Wallet, Wrench } from "lucide-react";
import { useDB } from "@/lib/store";

export const NAV = [
  { to: "/", label: "نقطة البيع", icon: ShoppingCart },
  { to: "/inventory", label: "المخزون", icon: Boxes },
  { to: "/sales", label: "المبيعات", icon: ReceiptText },
  { to: "/purchases", label: "المشتريات", icon: Truck },
  { to: "/customers", label: "العملاء", icon: Users },
  { to: "/treasury", label: "الخزينة", icon: Wallet },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="grid min-h-screen place-items-center text-muted-foreground">جارِ التحميل…</div>;
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const { settings, products } = useDB();
  const low = products.filter((p) => p.stock <= p.min).length;
  return (
    <div dir="rtl" className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-sidebar-border bg-sidebar/80 p-4 backdrop-blur lg:flex">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Wrench className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold">{settings.storeName}</div>
            <div className="truncate text-xs text-muted-foreground">{settings.subtitle}</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "!bg-primary/15 !text-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
              {n.to === "/inventory" && low > 0 && <span className="ms-auto rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{low}</span>}
            </Link>
          ))}
        </nav>
        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">الكاشير: <b className="text-foreground">{settings.cashier}</b></div>
      </aside>
      <main className="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-6 lg:pb-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-border bg-sidebar/95 backdrop-blur lg:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
            className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "!text-primary" }}>
            <n.icon className="h-5 w-5" /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
