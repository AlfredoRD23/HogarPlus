import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api, formatDate } from "../lib/api";
import type { NotificationType } from "@hogarplus/shared";

type InboxItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  clientId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<InboxItem[]>("/api/notifications"),
    refetchInterval: 30_000,
  });
  const unread = q.data?.meta && "unread" in q.data.meta ? Number(q.data.meta.unread ?? 0) : (q.data?.data ?? []).filter((item) => !item.readAt).length;
  const items = q.data?.data ?? [];

  const markAll = useMutation({
    mutationFn: () => api("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const onClick = () => setOpen(false);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-navy-900"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-semibold text-navy-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-[70] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white text-navy-900 shadow-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">Avisos</p>
            {unread > 0 && (
              <button className="text-xs font-semibold text-navy-700" onClick={() => markAll.mutate()}>
                Marcar leídos
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-sm text-slate-500">No hay avisos todavía.</li>}
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className={`w-full px-4 py-3 text-left text-sm ${item.readAt ? "bg-white" : "bg-gold-50"}`}
                  onClick={async () => {
                    await api(`/api/notifications/${item.id}/read`, { method: "POST" });
                    qc.invalidateQueries({ queryKey: ["notifications"] });
                    setOpen(false);
                    switch (item.type) {
                      case "PRODUCT_REQUEST":
                      case "PAYMENT_CLAIM":
                        navigate("/solicitudes");
                        break;
                      case "COLLECT_ME":
                        navigate(item.clientId ? `/clientes/${item.clientId}` : "/cobranza");
                        break;
                      case "REFERRAL_LEAD":
                      case "REFERRAL_REGISTERED":
                        navigate(item.clientId ? `/clientes/${item.clientId}` : "/clientes");
                        break;
                      default: {
                        const _exhaustive: never = item.type;
                        return _exhaustive;
                      }
                    }
                  }}
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-slate-600">{item.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatDate(item.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
