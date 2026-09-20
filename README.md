# HogarPlus

Plataforma de venta por catálogo a crédito para República Dominicana. El sistema separa **precio, saldo, cobro, costo de mercancía, gasto y utilidad**: el dinero cobrado no se trata como ganancia.

## Stack

- **API:** Node.js, Express, TypeScript, Prisma, MySQL/MariaDB
- **Web:** React, TypeScript, Vite, PWA (instalable)
- **Patrón:** cada dominio usa las mismas capas `schema → service → controller → routes`

## Arranque

Requisitos: Node 20+ y MySQL o MariaDB en el puerto 3306.

```bash
npm install
cd apps/api
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
cd ../..
npm run dev
```

Si MariaDB está instalado pero no arranca:

```powershell
& "C:\Program Files\MariaDB 13.0\bin\mysqld.exe" --defaults-file="C:/Program Files/MariaDB 13.0/data/my.ini" --console
```

- App interna: http://localhost:5173
- Portal del cliente: http://localhost:5173/portal
- API: http://localhost:4000/api/health

Usuario demo: `admin@hogarplus.do` / `Admin123!`

También: `ventas@hogarplus.do`, `cobranza@hogarplus.do`, `inventario@hogarplus.do` (misma clave).

Consulta de portal: cédula `001-0000001-7` y teléfono `809-111-0001`.

## Módulos

Clientes, productos, inventario, créditos con calendario semanal, pagos y adelantos, puntos y niveles, cobranza, dashboard, reportes, gastos, usuarios con roles y auditoría.

Los puntos no sustituyen la evaluación de capacidad de pago. El catálogo C exige aprobación expresa.

Antes de operar con clientes reales, el contrato, impuestos y protección de datos deben revisarse con profesionales en República Dominicana.
