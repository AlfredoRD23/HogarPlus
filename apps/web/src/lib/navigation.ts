import { canAccessModule, type AppModule, type Role } from "@hogarplus/shared";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  FileText,
  Wallet,
  Bell,
  BarChart3,
  Receipt,
  Settings,
  Shield,
  MapPinned,
  Inbox,
} from "lucide-react";

export type NavItem = {
  id: AppModule;
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  end?: boolean;
  keywords: string[];
};

export const NAV_GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "inicio",
    label: "Inicio",
    items: [
      {
        id: "dashboard",
        to: "/dashboard",
        label: "Dashboard",
        description: "Cartera, cobros e inventario",
        icon: LayoutDashboard,
        end: true,
        keywords: ["inicio", "panel", "resumen"],
      },
    ],
  },
  {
    id: "comercial",
    label: "Comercial",
    items: [
      {
        id: "clientes",
        to: "/clientes",
        label: "Clientes",
        description: "Afiliación, puntos y créditos",
        icon: Users,
        keywords: ["cliente", "afiliación", "cedula"],
      },
      {
        id: "productos",
        to: "/productos",
        label: "Catálogo",
        description: "Productos Bronce, Plata y Oro",
        icon: Package,
        keywords: ["producto", "catalogo", "sku"],
      },
      {
        id: "creditos",
        to: "/creditos",
        label: "Créditos",
        description: "Contratos, cuotas y saldo",
        icon: FileText,
        keywords: ["credito", "contrato", "entrega"],
      },
    ],
  },
  {
    id: "cobros",
    label: "Cobros",
    items: [
      {
        id: "pagos",
        to: "/pagos",
        label: "Pagos",
        description: "Registrar cobros y adelantos",
        icon: Wallet,
        keywords: ["pago", "abono", "cuota"],
      },
      {
        id: "cobranza",
        to: "/cobranza",
        label: "Cobranza",
        description: "Al día, pendientes y atrasados",
        icon: Bell,
        keywords: ["mora", "vencido", "seguimiento"],
      },
      {
        id: "rutas",
        to: "/rutas",
        label: "Rutas",
        description: "Zonas de cobro y clientes de cada ruta",
        icon: MapPinned,
        keywords: ["ruta", "zona", "villamella", "barrio"],
      },
      {
        id: "solicitudes",
        to: "/solicitudes",
        label: "Solicitudes",
        description: "Pedidos y avisos de pago del portal",
        icon: Inbox,
        keywords: ["solicitud", "pedido", "portal"],
      },
    ],
  },
  {
    id: "operacion",
    label: "Operación",
    items: [
      {
        id: "inventario",
        to: "/inventario",
        label: "Inventario",
        description: "Entradas, salidas y stock",
        icon: Warehouse,
        keywords: ["stock", "almacen", "kardex"],
      },
      {
        id: "gastos",
        to: "/gastos",
        label: "Gastos",
        description: "Costos operativos separados del cobro",
        icon: Receipt,
        keywords: ["gasto", "nomina", "transporte"],
      },
    ],
  },
  {
    id: "direccion",
    label: "Dirección",
    items: [
      {
        id: "reportes",
        to: "/reportes",
        label: "Reportes",
        description: "Caja, margen y tendencia real",
        icon: BarChart3,
        keywords: ["reporte", "finanzas", "margen"],
      },
      {
        id: "usuarios",
        to: "/usuarios",
        label: "Usuarios",
        description: "Roles y acceso al sistema",
        icon: Shield,
        keywords: ["usuario", "rol", "permiso"],
      },
      {
        id: "configuracion",
        to: "/configuracion",
        label: "Configuración",
        description: "Cuotas, afiliación y reserva",
        icon: Settings,
        keywords: ["ajuste", "cuota", "afiliacion"],
      },
    ],
  },
];

export function flatNav(role: Role): NavItem[] {
  return NAV_GROUPS.flatMap((g) => g.items.filter((i) => canAccessModule(role, i.id)));
}
