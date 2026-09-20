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
  .factura-root, .factura-root * { box-sizing: border-box; }
  .factura-root {
    font-family: Inter, Segoe UI, sans-serif;
    color: #122033;
    width: 980px;
    background: #f8fafc;
  }
  .sheet { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; }
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
`;

function invoiceMarkup(invoice: InvoiceData) {
  const fields = invoiceFields(invoice);
  return `
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
        <p class="foot">Este documento confirma el pago recibido. Guárdalo para tu control.</p>
      </div>
    </div>
  `;
}

function invoiceFileName(invoice: InvoiceData) {
  const raw = String(invoice.number || "pago").trim() || "pago";
  return `Factura_${raw.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_")}.pdf`;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadInvoicePdf(invoice: InvoiceData) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = "-100000px";
  overlay.style.top = "0";
  overlay.style.zIndex = "1000";
  overlay.setAttribute("aria-hidden", "true");

  const host = document.createElement("div");
  host.style.width = "980px";
  host.style.backgroundColor = "#f8fafc";
  host.className = "factura-root";
  host.innerHTML = `<style>${INVOICE_CSS}</style>${invoiceMarkup(invoice)}`;
  overlay.appendChild(host);
  document.body.appendChild(overlay);

  try {
    const canvas = await html2canvas(host, {
      backgroundColor: "#f8fafc",
      useCORS: true,
      scale: 2,
      logging: false,
    });
    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const image = canvas.toDataURL("image/jpeg", 0.82);

    if (imgHeight <= pageHeight) {
      doc.addImage(image, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
    } else {
      const pxPerUnit = canvas.width / imgWidth;
      const sliceHeightPxBase = Math.floor(pageHeight * pxPerUnit);
      let offsetY = 0;
      let pageIndex = 0;
      while (offsetY < canvas.height) {
        const sliceHeightPx = Math.min(sliceHeightPxBase, canvas.height - offsetY);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceHeightPx;
        const ctx = slice.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeightPx, 0, 0, slice.width, slice.height);
        }
        if (pageIndex > 0) doc.addPage();
        doc.addImage(
          slice.toDataURL("image/jpeg", 0.82),
          "JPEG",
          0,
          0,
          imgWidth,
          (sliceHeightPx * imgWidth) / canvas.width,
          undefined,
          "FAST",
        );
        offsetY += sliceHeightPx;
        pageIndex += 1;
      }
    }

    const fileName = invoiceFileName(invoice);
    saveBlob(doc.output("blob"), fileName);
    return { fileName };
  } finally {
    overlay.remove();
  }
}

export async function openInvoice(invoice: InvoiceData) {
  toast.loading("Generando PDF...", { id: "invoice-pdf" });
  try {
    const result = await downloadInvoicePdf(invoice);
    toast.success(`Se descargó ${result.fileName}`, { id: "invoice-pdf" });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "No se pudo generar el PDF", { id: "invoice-pdf" });
  }
}
