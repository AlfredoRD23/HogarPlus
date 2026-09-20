import toast from "react-hot-toast";
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

function invoiceFields(invoice: InvoiceData) {
  return {
    company: invoice.companyName?.trim() || "HogarPlus",
    city: invoice.companyCity?.trim() || "República Dominicana",
    concept: PAYMENT_TYPE_LABELS[invoice.type] ?? invoice.type ?? "Pago",
    method: PAYMENT_METHOD_LABELS[invoice.method] ?? invoice.method ?? "",
    product: invoice.productName || "Pago registrado",
    amount: money(invoice.amount),
    date: formatDate(invoice.issuedAt),
    cedula: formatCedula(invoice.documentId),
    phone: formatPhoneRD(invoice.phone),
  };
}

const INVOICE_CSS = `
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Inter, Segoe UI, sans-serif; background: #f8fafc; color: #122033; margin: 0; }
  .sheet { max-width: 880px; margin: 24px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; }
  .top { padding: 22px 32px; background: #1A2F52; color: #fff; text-align: center; }
  .name { margin: 0; font-size: 22px; font-weight: 800; }
  .gold { margin: 6px 0 0; color: #D4BC7A; font-size: 13px; }
  .content { padding: 28px 32px 32px; }
  .header-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
  .doc-type { font-size: 13px; letter-spacing: .16em; color: #64748b; font-weight: 800; }
  .doc-number { margin-top: 8px; font-size: 26px; font-weight: 800; }
  .badge { display: inline-block; margin-top: 10px; padding: 6px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; }
  .meta { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
  .meta-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
  .meta-row:last-child { border-bottom: none; }
  .meta-row span { color: #64748b; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
  .panel { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
  .panel-title { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #64748b; font-weight: 800; }
  .panel-main { margin-top: 10px; font-size: 16px; font-weight: 800; }
  .panel-sub { margin-top: 6px; font-size: 13px; color: #64748b; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 22px; }
  table.items th { text-align: left; background: #f1f5f9; padding: 10px 12px; font-size: 12px; }
  table.items td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
  .total { font-size: 18px; font-weight: 800; }
  .foot { margin-top: 28px; font-size: 12px; color: #64748b; }
  .no-print { position: sticky; top: 0; z-index: 20; background: rgba(18, 32, 51, 0.94); padding: 10px 12px; }
  .toolbar-inner { max-width: 880px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #fff; }
  .toolbar-title { font-weight: 800; font-size: 13px; }
  .toolbar-actions { display: flex; gap: 8px; }
  .toolbar-btn { border: 1px solid rgba(255,255,255,.25); border-radius: 10px; padding: 7px 12px; font-size: 12px; font-weight: 800; cursor: pointer; color: #122033; background: #C4A04A; }
  .toolbar-btn.secondary { background: transparent; color: #fff; }
  @media print {
    .no-print { display: none !important; }
    body { background: #fff; }
    .sheet { margin: 0; border: 0; border-radius: 0; }
  }
  @media (max-width: 700px) {
    .header-grid, .two-col { grid-template-columns: 1fr; }
    .sheet { margin: 12px; }
  }
`;

export function invoiceHtml(invoice: InvoiceData) {
  const fields = invoiceFields(invoice);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Factura ${text(invoice.number)}</title>
    <style>${INVOICE_CSS}</style>
  </head>
  <body>
    <div class="no-print">
      <div class="toolbar-inner">
        <div class="toolbar-title">Vista previa de factura</div>
        <div class="toolbar-actions">
          <button type="button" class="toolbar-btn" id="factura-download-btn">Descargar PDF</button>
          <button type="button" class="toolbar-btn secondary" id="factura-close-btn">Cerrar</button>
        </div>
      </div>
    </div>
    <div class="sheet">
      <div class="top">
        <p class="name">${text(fields.company)}</p>
        <p class="gold">${text(fields.city)}</p>
      </div>
      <div class="content">
        <div class="header-grid">
          <div>
            <div class="doc-type">RECIBO DE PAGO</div>
            <div class="doc-number">${text(invoice.number)}</div>
            <span class="badge">Pagado</span>
          </div>
          <div class="meta">
            <div class="meta-row"><span>Fecha</span><strong>${text(fields.date)}</strong></div>
            <div class="meta-row"><span>Método</span><strong>${text(fields.method)}</strong></div>
            ${invoice.reference ? `<div class="meta-row"><span>Referencia</span><strong>${text(invoice.reference)}</strong></div>` : ""}
          </div>
        </div>
        <div class="two-col">
          <div class="panel">
            <div class="panel-title">Cliente</div>
            <div class="panel-main">${text(invoice.clientName)}</div>
            <div class="panel-sub">${text(invoice.clientCode)} · Cédula ${text(fields.cedula)}</div>
            <div class="panel-sub">${text(fields.phone)}${invoice.city ? ` · ${text(invoice.city)}` : ""}</div>
          </div>
          <div class="panel">
            <div class="panel-title">Concepto</div>
            <div class="panel-main">${text(fields.concept)}</div>
            <div class="panel-sub">${text(fields.product)}${invoice.creditCode ? ` · ${text(invoice.creditCode)}` : ""}</div>
          </div>
        </div>
        <table class="items">
          <thead><tr><th>Detalle</th><th>Monto</th></tr></thead>
          <tbody>
            <tr>
              <td>${text(fields.product)}</td>
              <td class="total">${text(fields.amount)}</td>
            </tr>
          </tbody>
        </table>
        <p class="foot">Este documento confirma el pago recibido. Guárdalo o imprímelo para tu control.</p>
      </div>
    </div>
  </body>
</html>`;
}

function pdfEscape(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function downloadInvoicePdf(invoice: InvoiceData) {
  const fields = invoiceFields(invoice);
  const rows = [
    [28, fields.company],
    [14, fields.city],
    [18, `Factura ${invoice.number}`],
    [12, `Fecha ${fields.date}`],
    [12, ""],
    [14, invoice.clientName],
    [12, `${invoice.clientCode}  Cedula ${fields.cedula}`],
    [12, `${fields.phone}${invoice.city ? `  ${invoice.city}` : ""}`],
    [12, ""],
    [12, `${fields.concept}  ${fields.product}${invoice.creditCode ? `  ${invoice.creditCode}` : ""}`],
    [12, `Metodo ${fields.method}${invoice.reference ? `  Ref. ${invoice.reference}` : ""}`],
    [16, `Total ${fields.amount}`],
  ];
  const lines = rows
    .map(([size, line], index) => `BT /F1 ${size} Tf 48 ${760 - index * 22} Td (${pdfEscape(String(line))}) Tj ET`)
    .join("\n");
  const stream = `BT /F1 12 Tf 48 800 Td (${pdfEscape("HogarPlus")}) Tj ET\n${lines}`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const startxref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  const blob = new Blob([body], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Factura_${invoice.number || "pago"}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}

function bindInvoiceToolbar(preview: Window, invoice: InvoiceData) {
  const downloadBtn = preview.document.getElementById("factura-download-btn") as HTMLButtonElement | null;
  const closeBtn = preview.document.getElementById("factura-close-btn");
  downloadBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    downloadInvoicePdf(invoice);
    toast.success(`Se descargó Factura_${invoice.number}.pdf`);
  });
  closeBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    preview.close();
  });
}

export function openInvoice(invoice: InvoiceData) {
  let preview: Window | null = null;
  try {
    preview = window.open("", "_blank", "width=900,height=980");
  } catch {
    preview = null;
  }

  if (preview) {
    preview.document.open();
    preview.document.write(
      '<!doctype html><html><head><meta charset="utf-8" /><title>Generando factura...</title></head><body style="font-family:Inter,Segoe UI,sans-serif;padding:24px;color:#1A2F52">Generando factura...</body></html>',
    );
    preview.document.close();
  }

  const html = invoiceHtml(invoice);
  if (preview) {
    preview.document.open();
    preview.document.write(html);
    preview.document.close();
    bindInvoiceToolbar(preview, invoice);
    preview.focus();
    toast.success(`Se abrió la factura ${invoice.number}. Usa Descargar PDF para guardarla.`);
    return;
  }

  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  window.location.assign(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  toast.success(`Se abrió la factura ${invoice.number} en esta pestaña.`);
}
