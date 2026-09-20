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
  amount: number | string;
  method: PaymentMethod;
  type: PaymentType;
  reference?: string | null;
};

function text(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function invoiceHtml(invoice: InvoiceData) {
  const company = invoice.companyName?.trim() || "HogarPlus";
  const city = invoice.companyCity?.trim() || "República Dominicana";
  const concept = PAYMENT_TYPE_LABELS[invoice.type] ?? invoice.type ?? "Pago";
  const method = PAYMENT_METHOD_LABELS[invoice.method] ?? invoice.method ?? "";
  const product = invoice.productName || "Pago registrado";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Factura ${text(invoice.number)}</title>
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
        <p class="name">${text(company)}</p>
        <p class="gold">${text(city)}</p>
      </div>
      <div>
        <p><b>Factura</b> ${text(invoice.number)}</p>
        <p>${text(formatDate(invoice.issuedAt))}</p>
      </div>
    </div>
    <h1>Recibo de pago</h1>
    <p>${text(invoice.clientName)} · ${text(invoice.clientCode)}</p>
    <p>Cédula ${text(formatCedula(invoice.documentId))} · ${text(formatPhoneRD(invoice.phone))}${invoice.city ? ` · ${text(invoice.city)}` : ""}</p>
    <table>
      <thead><tr><th>Concepto</th><th>Detalle</th><th>Monto</th></tr></thead>
      <tbody>
        <tr>
          <td>${text(concept)}</td>
          <td>${text(product)}${invoice.creditCode ? ` · ${text(invoice.creditCode)}` : ""}</td>
          <td class="total">${text(money(invoice.amount))}</td>
        </tr>
      </tbody>
    </table>
    <p>Método: ${text(method)}${invoice.reference ? ` · Ref. ${text(invoice.reference)}` : ""}</p>
    <p class="foot">Este documento confirma el pago recibido. Guárdalo o imprímelo para tu control.</p>
  </body>
</html>`;
}

export function openInvoice(invoice: InvoiceData) {
  const html = invoiceHtml(invoice);
  const page = window.open("", "_blank", "width=820,height=980");
  if (page) {
    page.document.open();
    page.document.write(html);
    page.document.close();
    page.focus();
    window.setTimeout(() => {
      try {
        page.print();
      } catch {
        /* el cliente puede imprimir a mano */
      }
    }, 250);
    return;
  }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `factura-${invoice.number || "pago"}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
