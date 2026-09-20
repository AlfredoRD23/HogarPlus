import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULTS, levelFromPoints, POINTS_RULES, withCedulaCheckDigit } from "@hogarplus/shared";

const prisma = new PrismaClient();

function addWeeks(date: Date, weeks: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

async function main() {
  await prisma.paymentAllocation.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.collectionNote.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.credit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.client.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.sequence.deleteMany();

  const passwordHash = await bcrypt.hash("Admin123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@hogarplus.do",
      name: "Dirección HogarPlus",
      phone: "8095550001",
      role: "DIRECCION",
      passwordHash,
    },
  });

  await prisma.user.createMany({
    data: [
      { email: "ventas@hogarplus.do", name: "Carla Ventas", phone: "8095550002", role: "VENTAS", passwordHash },
      { email: "cobranza@hogarplus.do", name: "Luis Cobranza", phone: "8095550003", role: "COBRANZA", passwordHash },
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

  const productsData: Prisma.ProductCreateManyInput[] = [
    { sku: "HP-S-001", name: "Kit vitaminas y bienestar", description: "Suplementos de uso frecuente", category: "SALUD_BIENESTAR", catalogTier: "A", cost: 900, price: 2800, stock: 40, minStock: 5 },
    { sku: "HP-S-002", name: "Tensiómetro digital", description: "Monitoreo de presión arterial", category: "SALUD_BIENESTAR", catalogTier: "B", cost: 1200, price: 4500, stock: 18, minStock: 3 },
    { sku: "HP-B-001", name: "Set skincare esencial", description: "Cuidado facial diario", category: "BELLEZA", catalogTier: "A", cost: 800, price: 2600, stock: 35, minStock: 5 },
    { sku: "HP-B-002", name: "Plancha de cabello profesional", description: "Cuidado capilar", category: "BELLEZA", catalogTier: "B", cost: 1100, price: 5200, stock: 12, minStock: 3 },
    { sku: "HP-H-001", name: "Licuadora 2 velocidades", description: "Electrodoméstico de uso diario", category: "HOGAR", catalogTier: "A", cost: 1000, price: 3000, stock: 28, minStock: 4 },
    { sku: "HP-H-002", name: "Olla arrocera 1.8L", description: "Utensilio práctico para el hogar", category: "HOGAR", catalogTier: "A", cost: 950, price: 3200, stock: 22, minStock: 4 },
    { sku: "HP-H-003", name: "Freidora de aire compacta", description: "Tecnología para el hogar", category: "HOGAR", catalogTier: "B", cost: 1800, price: 6800, stock: 10, minStock: 2 },
    { sku: "HP-H-004", name: "Licuadora premium + kit", description: "Línea premium catálogo C", category: "HOGAR", catalogTier: "C", cost: 2500, price: 9800, stock: 6, minStock: 2 },
  ];

  await prisma.product.createMany({ data: productsData });
  const products = await prisma.product.findMany();
  const blender = products.find((p) => p.sku === "HP-H-001")!;
  const vitamins = products.find((p) => p.sku === "HP-S-001")!;
  const skincare = products.find((p) => p.sku === "HP-B-001")!;

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

  const names = [
    ["Ana", "Pérez", withCedulaCheckDigit("0010000001"), "8091110001", "Santo Domingo"],
    ["José", "Gómez", withCedulaCheckDigit("0010000002"), "8091110002", "Santiago"],
    ["Luisa", "Martínez", withCedulaCheckDigit("0010000003"), "8091110003", "La Vega"],
    ["Pedro", "Santos", withCedulaCheckDigit("0010000004"), "8091110004", "San Cristóbal"],
    ["Carmen", "Díaz", withCedulaCheckDigit("0010000005"), "8091110005", "Puerto Plata"],
    ["Miguel", "Reyes", withCedulaCheckDigit("0010000006"), "8091110006", "Santo Domingo"],
    ["Rosa", "Castillo", withCedulaCheckDigit("0010000007"), "8091110007", "San Pedro"],
    ["Juan", "Vargas", withCedulaCheckDigit("0010000008"), "8091110008", "La Romana"],
    ["Elena", "Núñez", withCedulaCheckDigit("0010000009"), "8091110009", "Moca"],
    ["Carlos", "Fernández", withCedulaCheckDigit("0010000010"), "8091110010", "Santo Domingo"],
    ["Patricia", "López", withCedulaCheckDigit("0010000011"), "8091110011", "Bonao"],
    ["Rafael", "Cruz", withCedulaCheckDigit("0010000012"), "8091110012", "Azua"],
  ];

  const clients = [];
  for (let i = 0; i < names.length; i++) {
    const [firstName, lastName, documentId, phone, city] = names[i];
    const client = await prisma.client.create({
      data: {
        code: `CLI${String(i + 1).padStart(6, "0")}`,
        firstName,
        lastName,
        documentId,
        phone,
        city,
        province: "República Dominicana",
        affiliationPaid: true,
        affiliationAt: addWeeks(new Date(), -8),
        createdById: admin.id,
        catalogApproved: i > 8,
      },
    });
    clients.push(client);

    await prisma.payment.create({
      data: {
        code: `PAG${String(i + 1).padStart(6, "0")}`,
        clientId: client.id,
        amount: DEFAULTS.affiliationFee,
        method: i % 2 === 0 ? "CASH" : "TRANSFER",
        type: "AFFILIATION",
        notes: "Afiliación / contrato",
        createdById: admin.id,
        createdAt: addWeeks(new Date(), -8),
      },
    });
    await prisma.pointsLedger.create({
      data: {
        clientId: client.id,
        action: "AFFILIATION",
        points: POINTS_RULES.AFFILIATION,
        note: "Completar afiliación/contrato",
      },
    });
  }

  const productCycle = [blender, vitamins, skincare];
  let paymentSeq = names.length + 1;
  let creditSeq = 1;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const product = productCycle[i % productCycle.length];
    const startDate = addWeeks(new Date(), -6);
    const weeks = 10;
    const weeklyQuota = new Prisma.Decimal(300);
    const price = product.price;
    const paidWeeks = i < 4 ? 6 : i < 8 ? 3 : 1;
    const paid = weeklyQuota.times(paidWeeks);
    const balance = new Prisma.Decimal(price).minus(paid);

    const credit = await prisma.credit.create({
      data: {
        code: `CRD${String(creditSeq++).padStart(6, "0")}`,
        clientId: client.id,
        productId: product.id,
        price,
        cost: product.cost,
        weeklyQuota,
        weeks,
        balance,
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
      },
    });

    let points = POINTS_RULES.AFFILIATION;
    for (let w = 0; w < weeks; w++) {
      const dueDate = addWeeks(startDate, w);
      const isPaid = w < paidWeeks;
      const late = i >= 8 && w === 0;
      await prisma.installment.create({
        data: {
          creditId: credit.id,
          number: w + 1,
          dueDate,
          amount: weeklyQuota,
          paidAmount: isPaid ? weeklyQuota : 0,
          status: isPaid ? (late ? "PAID" : "PAID") : dueDate < new Date() ? "OVERDUE" : "PENDING",
        },
      });

      if (isPaid) {
        await prisma.payment.create({
          data: {
            code: `PAG${String(paymentSeq++).padStart(6, "0")}`,
            clientId: client.id,
            creditId: credit.id,
            amount: weeklyQuota,
            method: w % 3 === 0 ? "TRANSFER" : "CASH",
            type: "INSTALLMENT",
            createdById: admin.id,
            createdAt: dueDate,
          },
        });
        const add = late ? 0 : POINTS_RULES.WEEKLY_ON_TIME;
        points += add;
        await prisma.pointsLedger.create({
          data: {
            clientId: client.id,
            action: late ? "LATE_PAYMENT" : "WEEKLY_ON_TIME",
            points: add,
            creditId: credit.id,
            note: late ? "Pago atrasado" : "Pago semanal a tiempo",
          },
        });
      }
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { points, level: levelFromPoints(points) },
    });
  }

  await prisma.expense.createMany({
    data: [
      { category: "TRANSPORT", amount: 4500, description: "Entregas zona norte", incurredOn: addWeeks(new Date(), -1), userId: admin.id },
      { category: "MARKETING", amount: 8000, description: "Volantes y redes", incurredOn: addWeeks(new Date(), -2), userId: admin.id },
      { category: "OPERATIONS", amount: 12000, description: "Alquiler depósito semanal prorrateado", incurredOn: new Date(), userId: admin.id },
    ],
  });

  await prisma.sequence.createMany({
    data: [
      { name: "client", value: clients.length },
      { name: "product", value: 4 },
      { name: "credit", value: clients.length },
      { name: "payment", value: paymentSeq - 1 },
    ],
  });

  console.log("Seed HogarPlus listo");
  console.log("Usuario:  admin@hogarplus.do");
  console.log("Clave:    Admin123!");
  console.log(`Portal:   ${names[0][2]} / ${names[0][3]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
