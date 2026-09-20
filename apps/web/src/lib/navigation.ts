import type { Role } from "@hogarplus/shared";
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
} from "lucide-react";

export type NavItem = {
  id: string;
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  end?: boolean;
  roles: Role[];
  keywords: string[];
};

export const ALL_ROLES: Role[] = [
  "DIRECCION",
  "VENTAS",
  "COBRANZA",
  "INVENTARIO",
  "ADMINISTRACION",
  "TECNOLOGIA",
];

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
        roles: ALL_ROLES,
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
        roles: ["DIRECCION", "VENTAS", "COBRANZA", "ADMINISTRACION"],
        keywords: ["cliente", "afiliación", "cedula"],
      },
      {
        id: "productos",
        to: "/productos",
        label: "Catálogo",
        description: "Productos y niveles A, B y C",
        icon: Package,
        roles: ["DIRECCION", "VENTAS", "INVENTARIO", "ADMINISTRACION"],
        keywords: ["producto", "catalogo", "sku"],
      },
      {
        id: "creditos",
        to: "/creditos",
        label: "Créditos",
        description: "Contratos, cuotas y saldo",
        icon: FileText,
        roles: ["DIRECCION", "VENTAS", "ADMINISTRACION"],
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
        roles: ["DIRECCION", "COBRANZA", "VENTAS", "ADMINISTRACION"],
        keywords: ["pago", "abono", "cuota"],
      },
      {
        id: "cobranza",
        to: "/cobranza",
        label: "Cobranza",
        description: "Al día, vencidos y adelantados",
        icon: Bell,
        roles: ["DIRECCION", "COBRANZA", "ADMINISTRACION"],
        keywords: ["mora", "vencido", "seguimiento"],
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
        roles: ["DIRECCION", "INVENTARIO", "ADMINISTRACION"],
        keywords: ["stock", "almacen", "kardex"],
      },
      {
        id: "gastos",
        to: "/gastos",
        label: "Gastos",
        description: "Costos operativos separados del cobro",
        icon: Receipt,
        roles: ["DIRECCION", "ADMINISTRACION"],
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
        roles: ["DIRECCION", "ADMINISTRACION"],
        keywords: ["reporte", "finanzas", "margen"],
      },
      {
        id: "usuarios",
        to: "/usuarios",
        label: "Usuarios",
        description: "Roles y acceso al sistema",
        icon: Shield,
        roles: ["DIRECCION", "TECNOLOGIA", "ADMINISTRACION"],
        keywords: ["usuario", "rol", "permiso"],
      },
      {
        id: "configuracion",
        to: "/configuracion",
        label: "Configuración",
        description: "Cuotas, afiliación y reserva",
        icon: Settings,
        roles: ["DIRECCION", "TECNOLOGIA"],
        keywords: ["ajuste", "cuota", "afiliacion"],
      },
    ],
  },
];

export function flatNav(role: Role): NavItem[] {
  return NAV_GROUPS.flatMap((g) => g.items.filter((i) => i.roles.includes(role) || role === "DIRECCION"));
}
