export type EmailTemplateId =
  | "staff_alert"
  | "payment_received"
  | "payment_claim_received"
  | "payment_claim_approved"
  | "payment_claim_rejected"
  | "product_request_received"
  | "product_request_approved"
  | "product_request_rejected"
  | "product_delivered";

export type EmailPayload = {
  subject: string;
  html: string;
  text: string;
};

type ShellInput = {
  title: string;
  subtitle?: string;
  contentHtml: string;
  cta?: { label: string; url: string };
};

type DetailRow = { label: string; value: string };

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraph(text: string) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;font-family:Arial,sans-serif;">${escapeHtml(text)}</p>`;
}

function detailsTable(rows: DetailRow[]) {
  if (rows.length === 0) return "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      ${rows
        .map(
          (row, index) => `
        <tr>
          <td style="padding:12px 16px;background:${index % 2 === 0 ? "#f8fafc" : "#ffffff"};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;font-family:Arial,sans-serif;width:38%;">${escapeHtml(row.label)}</td>
          <td style="padding:12px 16px;background:${index % 2 === 0 ? "#f8fafc" : "#ffffff"};font-size:14px;font-weight:600;color:#0f172a;font-family:Arial,sans-serif;">${escapeHtml(row.value)}</td>
        </tr>`,
        )
        .join("")}
    </table>`;
}

export function buildEmailShell({ title, subtitle, contentHtml, cta }: ShellInput) {
  return `
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;padding:0;background:#eef2f7;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;">
        <tr>
          <td align="center" style="padding:28px 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-radius:16px;overflow:hidden;border:1px solid #dbe3ee;">

              <tr>
                <td style="background:#122033;padding:28px 32px 22px 32px;text-align:center;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>
                      <td style="padding-right:12px;vertical-align:middle;">
                        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#C4A04A,#E8C97A);display:inline-block;text-align:center;line-height:40px;font-size:15px;font-weight:900;color:#122033;font-family:Arial,sans-serif;">HP</div>
                      </td>
                      <td style="vertical-align:middle;text-align:left;">
                        <div style="font-size:10px;letter-spacing:0.35em;font-weight:700;color:#C4A04A;text-transform:uppercase;font-family:Arial,sans-serif;">HOGARPLUS</div>
                        <div style="font-size:18px;font-weight:800;color:#ffffff;line-height:1.2;font-family:Arial,sans-serif;margin-top:2px;">${escapeHtml(title)}</div>
                      </td>
                    </tr>
                  </table>
                  ${subtitle ? `<div style="margin-top:10px;font-size:13px;color:#94a3b8;font-family:Arial,sans-serif;">${escapeHtml(subtitle)}</div>` : ""}
                </td>
              </tr>

              <tr>
                <td style="background:#ffffff;padding:26px 32px;">
                  ${contentHtml}
                  ${
                    cta?.url
                      ? `
                  <div style="margin-top:24px;text-align:center;">
                    <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 24px;background:#122033;color:#f5e6c8;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;font-family:Arial,sans-serif;">
                      ${escapeHtml(cta.label || "Abrir HogarPlus")}
                    </a>
                  </div>`
                      : ""
                  }
                </td>
              </tr>

              <tr>
                <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
                  <div style="font-size:11px;font-weight:700;color:#C4A04A;letter-spacing:0.2em;font-family:Arial,sans-serif;">HOGARPLUS</div>
                  <div style="margin-top:4px;font-size:11px;color:#94a3b8;font-family:Arial,sans-serif;">Correo automático · No responder a este mensaje</div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function pack(subject: string, title: string, subtitle: string, greeting: string, body: string, rows: DetailRow[], footer?: string, cta?: ShellInput["cta"]): EmailPayload {
  const contentHtml = [
    paragraph(greeting),
    paragraph(body),
    detailsTable(rows),
    footer ? paragraph(footer) : "",
  ].join("");

  const html = buildEmailShell({ title, subtitle, contentHtml, cta });
  const textLines = [
    title,
    "",
    greeting,
    body,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    footer ? `\n${footer}` : "",
  ].filter(Boolean);

  return { subject, html, text: textLines.join("\n") };
}

export type ClientEmailVars = {
  clientName: string;
  productName?: string;
  amount?: string;
  reference?: string;
  method?: string;
  creditCode?: string;
  reason?: string;
  weeks?: string;
  weeklyQuota?: string;
  portalUrl?: string;
};

export function renderStaffAlert(title: string, message: string): EmailPayload {
  const contentHtml = paragraph(message);
  const html = buildEmailShell({
    title,
    subtitle: "Aviso interno del equipo",
    contentHtml,
  });
  return {
    subject: `HogarPlus · ${title}`,
    html,
    text: `${title}\n\n${message}`,
  };
}

export function renderClientEmail(id: EmailTemplateId, vars: ClientEmailVars): EmailPayload {
  const name = vars.clientName.trim() || "cliente";
  const product = vars.productName ?? "tu producto";
  const amount = vars.amount ?? "";
  const reference = vars.reference ?? "";
  const method = vars.method ?? "";
  const creditCode = vars.creditCode ?? "";
  const reason = vars.reason ?? "";
  const cta = vars.portalUrl ? { label: "Ir al portal", url: vars.portalUrl } : undefined;

  switch (id) {
    case "staff_alert":
      return renderStaffAlert("Aviso", vars.reason || "Nuevo aviso en HogarPlus");
    case "payment_received":
      return pack(
        "HogarPlus · Pago recibido",
        "Pago recibido",
        "Confirmación de pago",
        `Hola ${name},`,
        "Registramos tu pago correctamente. Gracias por mantener al día tus cuotas.",
        [
          ...(product ? [{ label: "Producto", value: product }] : []),
          ...(amount ? [{ label: "Monto", value: amount }] : []),
          ...(reference ? [{ label: "Referencia", value: reference }] : []),
          ...(method ? [{ label: "Método", value: method }] : []),
          ...(creditCode ? [{ label: "Crédito", value: creditCode }] : []),
        ],
        "Puedes revisar el saldo y las próximas cuotas en tu portal.",
        cta,
      );
    case "payment_claim_received":
      return pack(
        "HogarPlus · Recibimos tu aviso de pago",
        "Aviso de pago recibido",
        "En revisión",
        `Hola ${name},`,
        "Recibimos tu aviso de pago desde el portal. El equipo lo revisará y te confirmaremos cuando quede aplicado.",
        [
          ...(product ? [{ label: "Producto", value: product }] : []),
          ...(amount ? [{ label: "Monto avisado", value: amount }] : []),
          ...(method ? [{ label: "Método", value: method }] : []),
        ],
        "Si enviaste comprobante, consérvalo hasta que veas el pago reflejado.",
        cta,
      );
    case "payment_claim_approved":
      return pack(
        "HogarPlus · Pago aceptado",
        "Pago aceptado",
        "Comprobante validado",
        `Hola ${name},`,
        "Tu aviso de pago fue aceptado y el monto ya quedó aplicado a tu crédito.",
        [
          ...(product ? [{ label: "Producto", value: product }] : []),
          ...(amount ? [{ label: "Monto", value: amount }] : []),
          ...(reference ? [{ label: "Referencia", value: reference }] : []),
        ],
        "Gracias por pagar a tiempo.",
        cta,
      );
    case "payment_claim_rejected":
      return pack(
        "HogarPlus · Aviso de pago rechazado",
        "Aviso rechazado",
        "Necesitamos corregirlo",
        `Hola ${name},`,
        "Revisamos tu aviso de pago y no pudo aceptarse. Puedes enviar uno nuevo con los datos correctos.",
        [
          ...(product ? [{ label: "Producto", value: product }] : []),
          ...(amount ? [{ label: "Monto avisado", value: amount }] : []),
          ...(reason ? [{ label: "Motivo", value: reason }] : []),
        ],
        "Si tienes dudas, escribe a tu cobrador o a WhatsApp de HogarPlus.",
        cta,
      );
    case "product_request_received":
      return pack(
        "HogarPlus · Solicitud recibida",
        "Solicitud recibida",
        "Catálogo del portal",
        `Hola ${name},`,
        `Recibimos tu solicitud de ${product}. El equipo la revisará y te avisaremos cuando haya una decisión.`,
        [{ label: "Producto", value: product }],
        "Mientras tanto puedes seguir viendo tu catálogo y tus cuotas en el portal.",
        cta,
      );
    case "product_request_approved":
      return pack(
        "HogarPlus · Solicitud aceptada",
        "Solicitud aceptada",
        "Buenas noticias",
        `Hola ${name},`,
        `Tu solicitud de ${product} fue aceptada. Pronto coordinaremos la entrega.`,
        [{ label: "Producto", value: product }],
        "Te avisaremos cuando el producto quede entregado en tu cuenta.",
        cta,
      );
    case "product_request_rejected":
      return pack(
        "HogarPlus · Solicitud no aprobada",
        "Solicitud no aprobada",
        "Catálogo del portal",
        `Hola ${name},`,
        `Por ahora no pudimos aprobar tu solicitud de ${product}.`,
        [
          { label: "Producto", value: product },
          ...(reason ? [{ label: "Motivo", value: reason }] : []),
        ],
        "Cuando cumplas las condiciones de tu categoría podrás volver a pedirlo.",
        cta,
      );
    case "product_delivered":
      return pack(
        "HogarPlus · Producto entregado",
        "Producto entregado",
        "Tu nuevo crédito",
        `Hola ${name},`,
        `Ya registramos la entrega de ${product}. Desde ahora puedes ver el plan de cuotas en tu portal.`,
        [
          { label: "Producto", value: product },
          ...(creditCode ? [{ label: "Crédito", value: creditCode }] : []),
          ...(vars.weeks ? [{ label: "Cuotas", value: vars.weeks }] : []),
          ...(vars.weeklyQuota ? [{ label: "Cuota", value: vars.weeklyQuota }] : []),
        ],
        "Recuerda pagar a tiempo para sumar puntos y subir de nivel.",
        cta,
      );
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export const EMAIL_TEMPLATE_CATALOG: {
  id: EmailTemplateId;
  name: string;
  description: string;
  audience: "cliente" | "equipo";
}[] = [
  { id: "payment_received", name: "Pago recibido", description: "Cuando se registra un pago en el sistema.", audience: "cliente" },
  { id: "payment_claim_received", name: "Aviso de pago recibido", description: "Cuando el cliente envía un comprobante o aviso desde el portal.", audience: "cliente" },
  { id: "payment_claim_approved", name: "Pago aceptado", description: "Cuando el equipo acepta un aviso del portal.", audience: "cliente" },
  { id: "payment_claim_rejected", name: "Aviso rechazado", description: "Cuando el equipo rechaza un aviso de pago.", audience: "cliente" },
  { id: "product_request_received", name: "Solicitud de producto", description: "Confirmación al pedir un producto desde el portal.", audience: "cliente" },
  { id: "product_request_approved", name: "Solicitud aceptada", description: "Cuando ventas aprueba una solicitud.", audience: "cliente" },
  { id: "product_request_rejected", name: "Solicitud rechazada", description: "Cuando ventas rechaza una solicitud.", audience: "cliente" },
  { id: "product_delivered", name: "Producto entregado", description: "Cuando se crea el crédito y se entrega el artículo.", audience: "cliente" },
  { id: "staff_alert", name: "Aviso al equipo", description: "Notificaciones internas (solicitudes, avisos, referidos).", audience: "equipo" },
];

export function previewEmailTemplate(id: EmailTemplateId): EmailPayload {
  const sample: ClientEmailVars = {
    clientName: "María Pérez",
    productName: "Licuadora Premium",
    amount: "RD$ 1,500.00",
    reference: "PAGO-000042",
    method: "Transferencia",
    creditCode: "CRD-00018",
    reason: "El monto del comprobante no coincide",
    weeks: "12 semanas",
    weeklyQuota: "RD$ 850.00",
    portalUrl: "https://hogarplus.do/portal",
  };

  if (id === "staff_alert") {
    return renderStaffAlert(
      "Nueva solicitud de producto",
      "María Pérez (CLI-00012) pidió Licuadora Premium. Tel. 809-555-0101.",
    );
  }
  return renderClientEmail(id, sample);
}
