import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS, formatCedula, formatPhoneRD, type PaymentMethod, type PaymentType } from "@hogarplus/shared";
import { formatDate, money } from "./api";

export type InvoiceData = {
  number: string;
  issuedAt: string;
  companyName: string;
  companyCity: string;
  clientName: string;
  clientCode: string;
  documentId: string;
  phone: string;
  city?: string | null;
  productName: string;
  creditCode?: string | null;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  reference?: string | null;
};

export function openInvoice(invoice: InvoiceData) {
  const page = window.open("", "_blank", "noopener,noreferrer,width=820,height=980");
  if (!page) return;
  page.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Factura ${invoice.number}</title>
    <style>
      body { font-family: Inter, Segoe UI, sans-serif; color: #122033; margin: 0; padding: 32px; }
      .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #1A2F52; padding-bottom: 20px; }
      .name { font-size: 28px; font-weight: 700; margin: 0; }
      .gold { color: #A88638; }
      h1 { font-size: 22px; margin: 28px 0 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { text-align: left; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
      .total { font-size: 20px; font-weight: 700; }
      .foot { margin-top: 36px; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="top">
      <div>
        <p class="name">${invoice.companyName}</p>
        <p class="gold">${invoice.companyCity}</p>
      </div>
      <div>
        <p><b>Factura</b> ${invoice.number}</p>
        <p>${formatDate(invoice.issuedAt)}</p>
      </div>
    </div>
    <h1>Recibo de pago</h1>
    <p>${invoice.clientName} · ${invoice.clientCode}</p>
    <p>Cédula ${formatCedula(invoice.documentId)} · ${formatPhoneRD(invoice.phone)}${invoice.city ? ` · ${invoice.city}` : ""}</p>
    <table>
      <thead><tr><th>Concepto</th><th>Detalle</th><th>Monto</th></tr></thead>
      <tbody>
        <tr>
          <td>${PAYMENT_TYPE_LABELS[invoice.type] ?? invoice.type}</td>
          <td>${invoice.productName}${invoice.creditCode ? ` · ${invoice.creditCode}` : ""}</td>
          <td class="total">${money(invoice.amount)}</td>
        </tr>
      </tbody>
    </table>
    <p>Método: ${PAYMENT_METHOD_LABELS[invoice.method] ?? invoice.method}${invoice.reference ? ` · Ref. ${invoice.reference}` : ""}</p>
    <p class="foot">Este documento confirma el pago recibido. Guárdalo o imprímelo para tu control.</p>
    <script>window.print()</script>
  </body>
</html>`);
  page.document.close();
}
