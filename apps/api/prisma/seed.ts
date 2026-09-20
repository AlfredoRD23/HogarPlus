import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULTS, levelFromPoints, POINTS_RULES, withCedulaCheckDigit } from "@hogarplus/shared";
import { applySla } from "../src/shared/sla";

const prisma = new PrismaClient();

function atNoon(date: Date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return atNoon(d);
}

function addWeeks(date: Date, weeks: number) {
  return addDays(date, weeks * 7);
}

type SeedClient = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  address: string;
  cedulaBase: string;
  sku: string;
  paidWeeks: number;
  extraPoints: number;
  startOffsetDays: number;
  prepaidFuture: number;
  catalogApproved?: boolean;
  collectionNote?: string;
  payToday?: boolean;
};

const people: SeedClient[] = [
  { firstName: "Ana", lastName: "Pérez", phone: "8095550101", city: "Santo Domingo", address: "Calle El Conde 42, Gazcue", cedulaBase: "0011482201", sku: "HP-H-001", paidWeeks: 6, extraPoints: 0, startOffsetDays: -38, prepaidFuture: 0, payToday: true },
  { firstName: "José", lastName: "Gómez", phone: "8295550102", city: "Santiago", address: "Av. Estrella Sadhalá 120", cedulaBase: "0312251182", sku: "HP-S-001", paidWeeks: 5, extraPoints: 40, startOffsetDays: -32, prepaidFuture: 0 },
  { firstName: "Luisa", lastName: "Martínez", phone: "8495550103", city: "La Vega", address: "Calle Restauración 18", cedulaBase: "0471023341", sku: "HP-B-001", paidWeeks: 7, extraPoints: 90, startOffsetDays: -45, prepaidFuture: 0 },
  { firstName: "Pedro", lastName: "Santos", phone: "8095550104", city: "San Cristóbal", address: "Calle Padre Ayala 9", cedulaBase: "0021184403", sku: "HP-H-002", paidWeeks: 4, extraPoints: 0, startOffsetDays: -28, prepaidFuture: 0 },
  { firstName: "Carmen", lastName: "Díaz", phone: "8295550105", city: "Puerto Plata", address: "Malecón 55, centro", cedulaBase: "0182035514", sku: "HP-S-001", paidWeeks: 3, extraPoints: 20, startOffsetDays: -21, prepaidFuture: 0 },
  { firstName: "Miguel", lastName: "Reyes", phone: "8495550106", city: "Santo Domingo Este", address: "Av. Las Américas km 7", cedulaBase: "0013096625", sku: "HP-B-001", paidWeeks: 5, extraPoints: 0, startOffsetDays: -35, prepaidFuture: 0 },
  { firstName: "Rosa", lastName: "Castillo", phone: "8095550107", city: "San Pedro de Macorís", address: "Calle Ramón Santana 14", cedulaBase: "0231147736", sku: "HP-H-001", paidWeeks: 4, extraPoints: 50, startOffsetDays: -42, prepaidFuture: 0, collectionNote: "No contestó WhatsApp el lunes. Quedó en pasar mañana a la oficina." },
  { firstName: "Juan", lastName: "Vargas", phone: "8295550108", city: "La Romana", address: "Villa Verde, casa 22", cedulaBase: "0262088847", sku: "HP-H-003", paidWeeks: 5, extraPoints: 50, startOffsetDays: -49, prepaidFuture: 0, collectionNote: "Prometió transferir la cuota de la semana pasada." },
  { firstName: "Elena", lastName: "Núñez", phone: "8495550109", city: "Moca", address: "Calle Duarte 88", cedulaBase: "0561129958", sku: "HP-S-002", paidWeeks: 6, extraPoints: 40, startOffsetDays: -56, prepaidFuture: 0, collectionNote: "Una semana de atraso. Visita programada." },
  { firstName: "Carlos", lastName: "Fernández", phone: "8095550110", city: "Bonao", address: "Res. Los Ríos, apto 3B", cedulaBase: "0282011069", sku: "HP-B-002", paidWeeks: 6, extraPoints: 180, startOffsetDays: -56, prepaidFuture: 0, catalogApproved: true, collectionNote: "Dos semanas sin pagar. Pedir abono mínimo." },
  { firstName: "Patricia", lastName: "López", phone: "8295550111", city: "Azua", address: "Calle Proyecto 4, no. 11", cedulaBase: "0024132170", sku: "HP-H-003", paidWeeks: 7, extraPoints: 170, startOffsetDays: -63, prepaidFuture: 0, catalogApproved: true, collectionNote: "Tres semanas. Dejar nota en la casa si no abre." },
  { firstName: "Rafael", lastName: "Cruz", phone: "8495550112", city: "San Francisco de Macorís", address: "Av. Presidente Antonio Guzmán 210", cedulaBase: "0563243281", sku: "HP-H-004", paidWeeks: 8, extraPoints: 410, startOffsetDays: -70, prepaidFuture: 0, catalogApproved: true, collectionNote: "Mora de varias semanas. Coordinar visita con cobranza." },
  { firstName: "Yolanda", lastName: "Mejía", phone: "8095550113", city: "Higüey", address: "Calle Agricultores 7", cedulaBase: "0284354392", sku: "HP-B-001", paidWeeks: 5, extraPoints: 40, startOffsetDays: -42, prepaidFuture: 2 },
  { firstName: "Ramón", lastName: "Tejada", phone: "8295550114", city: "Baní", address: "Calle Sánchez 31", cedulaBase: "0025465403", sku: "HP-S-001", paidWeeks: 6, extraPoints: 20, startOffsetDays: -35, prepaidFuture: 2 },
  { firstName: "Marisol", lastName: "Pimentel", phone: "8495550115", city: "Santo Domingo", address: "Ensanche Naco, calle Fantino 16", cedulaBase: "0016576514", sku: "HP-H-004", paidWeeks: 8, extraPoints: 420, startOffsetDays: -52, prepaidFuture: 1, catalogApproved: true },
  { firstName: "David", lastName: "Almonte", phone: "8095550116", city: "Santiago", address: "Los Jardines Metropolitanos", cedulaBase: "0317687625", sku: "HP-S-002", paidWeeks: 7, extraPoints: 170, startOffsetDays: -56, prepaidFuture: 0, catalogApproved: true, collectionNote: "Llamó; dice que paga el viernes." },
  { firstName: "Keila", lastName: "Rosario", phone: "8295550117", city: "La Vega", address: "Villa Olga, calle 3", cedulaBase: "0478798736", sku: "HP-B-002", paidWeeks: 4, extraPoints: 120, startOffsetDays: -28, prepaidFuture: 0, payToday: true },
  { firstName: "Héctor", lastName: "Báez", phone: "8495550118", city: "San Cristóbal", address: "Madderlake, manzana D", cedulaBase: "0029809847", sku: "HP-H-001", paidWeeks: 5, extraPoints: 0, startOffsetDays: -31, prepaidFuture: 0 },
  { firstName: "Noelia", lastName: "Guzmán", phone: "8095550119", city: "Puerto Plata", address: "Costambar, villa 8", cedulaBase: "0180910958", sku: "HP-H-004", paidWeeks: 8, extraPoints: 400, startOffsetDays: -63, prepaidFuture: 0, catalogApproved: true, collectionNote: "Prefiere pago en efectivo. Cuota vencida." },
  { firstName: "Óscar", lastName: "Taveras", phone: "8295550120", city: "Moca", address: "Calle Independencia 102", cedulaBase: "0561021069", sku: "HP-S-002", paidWeeks: 6, extraPoints: 50, startOffsetDays: -49, prepaidFuture: 0, collectionNote: "Dos cuotas vencidas. Llamar después de las 6 pm." },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    await tx.client.updateMany({ data: { referredById: null } });
    await tx.paymentAllocation.deleteMany();
    await tx.pointsLedger.deleteMany();
    await tx.collectionNote.deleteMany();
    await tx.payment.deleteMany();
    await tx.installment.deleteMany();
    await tx.inventoryMovement.deleteMany();
    await tx.credit.deleteMany();
    await tx.expense.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.client.deleteMany();
    await tx.product.deleteMany();
    await tx.user.deleteMany();
    await tx.setting.deleteMany();
    await tx.sequence.deleteMany();
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }, { timeout: 120000, maxWait: 20000 });

  const passwordHash = await bcrypt.hash("Admin123!", 10);
  const today = atNoon(new Date());

  const admin = await prisma.user.create({
    data: {
      email: "admin@hogarplus.do",
      name: "Dirección HogarPlus",
      phone: "8095550001",
      role: "DIRECCION",
      passwordHash,
    },
  });

  const cobrador = await prisma.user.create({
    data: { email: "cobranza@hogarplus.do", name: "Luis Cobranza", phone: "8095550003", role: "COBRANZA", passwordHash },
  });

  await prisma.user.createMany({
    data: [
      { email: "ventas@hogarplus.do", name: "Carla Ventas", phone: "8095550002", role: "VENTAS", passwordHash },
      { email: "inventario@hogarplus.do", name: "María Inventario", phone: "8095550004", role: "INVENTARIO", passwordHash },
    ],
  });

  await prisma.setting.createMany({
    data: [
      { key: "affiliationFee", value: String(DEFAULTS.affiliationFee) },
      { key: "weeklyQuota", value: String(DEFAULTS.weeklyQuota) },
      { key: "defaultWeeks", value: String(DEFAULTS.weeks) },
      { key: "cashReservePercent", value: "15" },
      { key: "companyName", value: "HogarPlus" },
      { key: "companyCity", value: "República Dominicana" },
    ],
  });

  await prisma.product.createMany({
    data: [
      { sku: "HP-S-001", name: "Kit vitaminas y bienestar", description: "Suplementos de uso frecuente", category: "SALUD_BIENESTAR", catalogTier: "A", cost: 900, price: 2800, stock: 40, minStock: 5 },
      { sku: "HP-S-002", name: "Tensiómetro digital", description: "Monitoreo de presión arterial", category: "SALUD_BIENESTAR", catalogTier: "B", cost: 1200, price: 4500, stock: 18, minStock: 3 },
      { sku: "HP-B-001", name: "Set skincare esencial", description: "Cuidado facial diario", category: "BELLEZA", catalogTier: "A", cost: 800, price: 2600, stock: 35, minStock: 5 },
      { sku: "HP-B-002", name: "Plancha de cabello profesional", description: "Cuidado capilar", category: "BELLEZA", catalogTier: "B", cost: 1100, price: 5200, stock: 12, minStock: 3 },
      { sku: "HP-H-001", name: "Licuadora 2 velocidades", description: "Electrodoméstico de uso diario", category: "HOGAR", catalogTier: "A", cost: 1000, price: 3000, stock: 28, minStock: 4 },
      { sku: "HP-H-002", name: "Olla arrocera 1.8L", description: "Utensilio práctico para el hogar", category: "HOGAR", catalogTier: "A", cost: 950, price: 3200, stock: 22, minStock: 4 },
      { sku: "HP-H-003", name: "Freidora de aire compacta", description: "Tecnología para el hogar", category: "HOGAR", catalogTier: "B", cost: 1800, price: 6800, stock: 10, minStock: 2 },
      { sku: "HP-H-004", name: "Licuadora premium + kit", description: "Línea premium catálogo Oro", category: "HOGAR", catalogTier: "C", cost: 2500, price: 9800, stock: 6, minStock: 2 },
    ],
  });

  const products = await prisma.product.findMany();
  const productBySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  for (const p of products) {
    await prisma.inventoryMovement.create({
      data: {
        productId: p.id,
        type: "IN",
        quantity: p.stock,
        unitCost: p.cost,
        reason: "Carga inicial de inventario",
        userId: admin.id,
      },
    });
  }

  let paymentSeq = 1;
  let creditSeq = 1;
  const weeks = 10;
  const weeklyQuota = new Prisma.Decimal(DEFAULTS.weeklyQuota);

  for (let i = 0; i < people.length; i += 1) {
    const row = people[i];
    const documentId = withCedulaCheckDigit(row.cedulaBase);
    const product = productBySku[row.sku];
    if (!product) throw new Error(`Producto no encontrado ${row.sku}`);

    const affiliatedAt = addWeeks(today, -8);
    const client = await prisma.client.create({
      data: {
        code: `CLI${String(i + 1).padStart(6, "0")}`,
        firstName: row.firstName,
        lastName: row.lastName,
        documentId,
        phone: row.phone,
        email: `${row.firstName.toLowerCase()}.${row.lastName.toLowerCase()}@correo.do`.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        city: row.city,
        address: row.address,
        province: "República Dominicana",
        affiliationPaid: true,
        affiliationAt: affiliatedAt,
        createdById: admin.id,
        catalogApproved: Boolean(row.catalogApproved),
        notes: row.collectionNote,
      },
    });

    await prisma.payment.create({
      data: {
        code: `PAG${String(paymentSeq++).padStart(6, "0")}`,
        clientId: client.id,
        amount: DEFAULTS.affiliationFee,
        method: i % 2 === 0 ? "CASH" : "TRANSFER",
        type: "AFFILIATION",
        notes: "Afiliación / contrato",
        createdById: admin.id,
        createdAt: affiliatedAt,
      },
    });
    await prisma.pointsLedger.create({
      data: {
        clientId: client.id,
        action: "AFFILIATION",
        points: POINTS_RULES.AFFILIATION,
        note: "Completar afiliación/contrato",
        createdAt: affiliatedAt,
      },
    });

    const startDate = addDays(today, row.startOffsetDays);
    const paid = weeklyQuota.times(row.paidWeeks + row.prepaidFuture);
    const balance = new Prisma.Decimal(product.price).minus(paid);

    const credit = await prisma.credit.create({
      data: {
        code: `CRD${String(creditSeq++).padStart(6, "0")}`,
        clientId: client.id,
        productId: product.id,
        price: product.price,
        cost: product.cost,
        weeklyQuota,
        weeks,
        balance: balance.lessThan(0) ? 0 : balance,
        status: "ACTIVE",
        startDate,
        deliveredAt: startDate,
        createdById: admin.id,
      },
    });

    await prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: 1 } } });
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: "OUT",
        quantity: 1,
        unitCost: product.cost,
        reason: `Entrega ${credit.code}`,
        creditId: credit.id,
        userId: admin.id,
        createdAt: startDate,
      },
    });

    let points = POINTS_RULES.AFFILIATION;
    let prepaidLeft = row.prepaidFuture;

    for (let w = 0; w < weeks; w += 1) {
      const dueDate = addWeeks(startDate, w);
      const isPaidWeek = w < row.paidWeeks;
      const isFuture = dueDate.getTime() > today.getTime();
      const isPrepaid = !isPaidWeek && isFuture && prepaidLeft > 0;
      if (isPrepaid) prepaidLeft -= 1;

      await prisma.installment.create({
        data: {
          creditId: credit.id,
          number: w + 1,
          dueDate,
          amount: weeklyQuota,
          paidAmount: isPaidWeek || isPrepaid ? weeklyQuota : 0,
          status: isPaidWeek ? "PAID" : isPrepaid ? "PREPAID" : "PENDING",
        },
      });

      if (isPaidWeek || isPrepaid) {
        const createdAt = row.payToday && w === row.paidWeeks - 1 ? today : dueDate;
        await prisma.payment.create({
          data: {
            code: `PAG${String(paymentSeq++).padStart(6, "0")}`,
            clientId: client.id,
            creditId: credit.id,
            amount: weeklyQuota,
            method: w % 3 === 0 ? "TRANSFER" : "CASH",
            type: isPrepaid ? "ADVANCE" : "INSTALLMENT",
            createdById: admin.id,
            createdAt,
          },
        });
        const add = isPrepaid ? POINTS_RULES.ADVANCE : POINTS_RULES.WEEKLY_ON_TIME;
        points += add;
        await prisma.pointsLedger.create({
          data: {
            clientId: client.id,
            action: isPrepaid ? "ADVANCE" : "WEEKLY_ON_TIME",
            points: add,
            creditId: credit.id,
            note: isPrepaid ? "Cuota adelantada" : "Pago semanal a tiempo",
            createdAt,
          },
        });
      }
    }

    points += row.extraPoints;
    if (row.extraPoints > 0) {
      await prisma.pointsLedger.create({
        data: {
          clientId: client.id,
          action: "PRODUCT_COMPLETED",
          points: row.extraPoints,
          note: "Historial de pagos y referidos",
        },
      });
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { points, level: levelFromPoints(points) },
    });

    if (row.collectionNote) {
      await prisma.collectionNote.create({
        data: {
          clientId: client.id,
          creditId: credit.id,
          channel: "WHATSAPP",
          note: row.collectionNote,
          userId: cobrador.id,
          createdAt: addDays(today, -1),
        },
      });
    }
  }

  await prisma.expense.createMany({
    data: [
      { category: "TRANSPORT", amount: 4500, description: "Combustible y entregas zona norte", incurredOn: addDays(today, -3), userId: admin.id },
      { category: "MARKETING", amount: 8000, description: "Volantes y pauta en redes", incurredOn: addDays(today, -10), userId: admin.id },
      { category: "OPERATIONS", amount: 12000, description: "Alquiler de depósito", incurredOn: today, userId: admin.id },
      { category: "PAYROLL", amount: 18000, description: "Semana de cobranza y ventas", incurredOn: addDays(today, -2), userId: admin.id },
    ],
  });

  const sla = await applySla();

  await prisma.sequence.createMany({
    data: [
      { name: "client", value: people.length },
      { name: "product", value: products.length },
      { name: "credit", value: creditSeq - 1 },
      { name: "payment", value: paymentSeq - 1 },
    ],
  });

  const first = people[0];
  console.log("Seed HogarPlus listo");
  console.log("Usuario:  admin@hogarplus.do");
  console.log("Clave:    Admin123!");
  console.log(`Portal:   ${withCedulaCheckDigit(first.cedulaBase)} / ${first.phone}`);
  console.log(`SLA:      ${sla.markedOverdue} cuotas marcadas atrasadas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
