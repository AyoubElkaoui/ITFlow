// Resend (fase 5). Via de HTTP-API, geen extra package. Staat los van de
// bestaande nodemailer/SMTP-opzet (lib/email.ts) die de portal-invites verstuurt.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Afzender is configureerbaar. Voor echte bezorging aan externe adressen moet dit
// een adres op een in Resend geverifieerd domein zijn (bv. noreply@itfin.nl).
// Default = Resend's testafzender (werkt zonder domeinverificatie, beperkt).
const DEFAULT_FROM = process.env.ORDER_MAIL_FROM || "ITFlow <onboarding@resend.dev>";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is niet ingesteld");
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from || DEFAULT_FROM,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Resend gaf status ${res.status}`,
    );
  }
  return { id: data.id };
}
