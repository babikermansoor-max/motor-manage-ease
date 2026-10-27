import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight, BarChart3, Boxes, LogOut, ReceiptText, Settings, ShieldCheck, ShoppingCart, Truck, Users, UserCog, Wallet, Warehouse, Wrench } from "lucide-react";
import { can, logout, permForPath, useCurrentUser, useDB, useSyncStatus } from "@/lib/store";

function SyncBadge() {
  const s = useSyncStatus();
  if (s.mode === "off") return null;
  const ok = s.online && s.pending === 0;
  const text = !s.online ? `غير متصل${s.pending ? ` · ${s.pending} بانتظار الرفع` : ""}` : s.pending ? `جارٍ الرفع (${s.pending})` : "متصل بالسيرفر";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? "bg-primary/15 text-primary" : s.online ? "bg-accent/20 text-accent" : "bg-destructive/15 text-destructive"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{text}</span>;
}

export const NAV = [
  { to: "/", label: "نقطة البيع", icon: ShoppingCart },
  { to: "/inventory", label: "المخزون", icon: Boxes },
  { to: "/sales", label: "المبيعات", icon: ReceiptText },
  { to: "/purchases", label: "المشتريات", icon: Truck },
  { to: "/customers", label: "العملاء", icon: Users },
  { to: "/treasury", label: "الخزينة", icon: Wallet },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/branches", label: "الفروع والمخازن", icon: Warehouse },
  { to: "/transfers", label: "تحويل مخزني", icon: ArrowLeftRight },
  { to: "/staff", label: "الموظفين", icon: UserCog },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="grid min-h-screen place-items-center text-muted-foreground">جارِ التحميل…</div>;
  return <Gate>{children}</Gate>;
}

function Gate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLogin = pathname === "/login";
  useEffect(() => { if (!user && !isLogin) navigate({ to: "/login", replace: true }); }, [user, isLogin, navigate]);
  if (isLogin) return <>{children}</>;
  if (!user) return null;
  const perm = permForPath(pathname);
  if (perm && !can(user, perm)) {
    const first = NAV.find((n) => can(user, permForPath(n.to)!));
    return <Shell><div className="glass mx-auto mt-16 max-w-md rounded-2xl p-8 text-center"><ShieldCheck className="mx-auto mb-3 h-10 w-10 text-accent" /><h1 className="text-lg font-bold">ليس لديك صلاحية لهذه الصفحة</h1><p className="mt-1 text-sm text-muted-foreground">تواصل مع المدير لمنحك الصلاحية.</p>{first && <Link to={first.to} className="mt-4 inline-block text-primary underline">الذهاب إلى {first.label}</Link>}</div></Shell>;
  }
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const { settings, products } = useDB();
  const low = products.filter((p) => p.stock <= p.min).length;
  const user = useCurrentUser();
  const navigate = useNavigate();
  const nav = NAV.filter((n) => can(user, permForPath(n.to)!));
  const out = () => { logout(); navigate({ to: "/login", replace: true }); };
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
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "!bg-primary/15 !text-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
              {n.to === "/inventory" && low > 0 && <span className="ms-auto rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{low}</span>}
            </Link>
          ))}
        </nav>
        <div className="mb-2"><SyncBadge /></div>
        <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground"><div className="min-w-0 flex-1"><b className="block truncate text-foreground">{user?.name}</b>{user?.role}</div><button onClick={out} title="تسجيل الخروج" className="rounded-lg p-2 hover:bg-destructive/15 hover:text-destructive"><LogOut className="h-4 w-4" /></button></div>
      </aside>
      <main className="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-6 lg:pb-8">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs lg:hidden"><span className="flex items-center gap-2"><span><b>{user?.name}</b> · {user?.role}</span><SyncBadge /></span><button onClick={out} className="flex items-center gap-1 text-destructive"><LogOut className="h-3.5 w-3.5" /> خروج</button></div>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-border bg-sidebar/95 backdrop-blur lg:hidden">
        {nav.map((n) => (
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
