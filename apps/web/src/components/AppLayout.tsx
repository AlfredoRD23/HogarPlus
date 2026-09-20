import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "@hogarplus/shared";
import { NAV_GROUPS, flatNav } from "../lib/navigation";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => sessionStorage.getItem("hp.sidebar") === "1");
  const [palette, setPalette] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const items = user ? flatNav(user.role) : [];
  const groups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => user && (user.role === "DIRECCION" || i.roles.includes(user.role))),
      })).filter((g) => g.items.length),
    [user],
  );

  useEffect(() => {
    sessionStorage.setItem("hp.sidebar", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape") setPalette(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const mobileMain = items.filter((i) => ["dashboard", "clientes", "cobranza", "pagos"].includes(i.id));
  const extras = items.filter((i) => !["dashboard", "clientes", "cobranza", "pagos"].includes(i.id));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-navy-800 bg-navy-900 px-4 text-white">
        <button className="flex items-center gap-2" onClick={() => navigate("/dashboard")}>
          <Logo compact />
          <span className="hidden font-display text-lg sm:inline">HogarPlus</span>
        </button>
        <div className="flex items-center gap-2">
          <button className="btn-search" onClick={() => setPalette(true)}>
            <Search size={16} />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden rounded bg-navy-800 px-1.5 py-0.5 text-[10px] lg:inline">Ctrl K</kbd>
          </button>
          <NotificationCenter />
          <div className="hidden items-center gap-2 rounded-xl bg-navy-800 px-3 py-1.5 md:flex">
            <div>
              <p className="text-sm font-semibold leading-none">{user?.name}</p>
              <p className="text-[11px] text-gold-300">{user ? ROLE_LABELS[user.role] : ""}</p>
            </div>
            <button
              className="text-slate-300"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <aside
        className={`fixed bottom-0 left-0 top-16 z-40 hidden flex-col border-r border-navy-800 bg-navy-900 text-white lg:flex ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <nav className={`sidebar-nav flex-1 overflow-y-auto overscroll-contain ${collapsed ? "space-y-1 p-2" : "space-y-4 p-3"}`}>
          {groups.map((group) => (
            <div key={group.id}>
              {!collapsed && (
                <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-gold-300">{group.label}</p>
              )}
              <div className={collapsed ? "space-y-0.5" : "space-y-1"}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      end={item.end}
                      title={item.label}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                          collapsed ? "justify-center px-2 py-2" : "py-2.5"
                        } ${
                          isActive ? "bg-gold-500 text-navy-950" : "text-slate-200 hover:bg-navy-800"
                        }`
                      }
                    >
                      <Icon size={18} />
                      {!collapsed && item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <button
          className="m-3 flex items-center justify-center rounded-xl border border-navy-700 py-2 text-gold-300"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <main className={`pt-16 ${collapsed ? "lg:pl-20" : "lg:pl-72"} pb-28 lg:pb-8`}>
        <div className="page-shell">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-3 gap-2 border-b px-3 py-2">
          <button className="quick-action" onClick={() => navigate("/clientes")}>
            <Plus size={16} /> Cliente
          </button>
          <button className="quick-action" onClick={() => navigate("/pagos")}>
            <Wallet size={16} /> Pago
          </button>
          <button className="quick-action" onClick={() => navigate("/cobranza")}>
            <Bell size={16} /> Cobro
          </button>
        </div>
        <div className="grid grid-cols-5">
          {mobileMain.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <button
                key={item.id}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] ${active ? "text-navy-900" : "text-slate-500"}`}
                onClick={() => navigate(item.to)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
          <button className="flex flex-col items-center gap-1 py-2 text-[11px] text-slate-500" onClick={() => setMoreOpen(true)}>
            <MoreHorizontal size={18} />
            Más
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] bg-navy-950/40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg">Más módulos</p>
              <button onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {extras.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-left text-sm"
                    onClick={() => {
                      navigate(item.to);
                      setMoreOpen(false);
                    }}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
              <button
                className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-left text-sm text-rose-700"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut size={16} /> Salir
              </button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
