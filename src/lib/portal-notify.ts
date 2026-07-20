import { after } from "next/server";
import { sendEmail } from "@/lib/resend";

const APP_URL = process.env.NEXTAUTH_URL || "https://it-flow-iota.vercel.app";
const APP_NAME = "ITFlow";

// Stuurt de klant een e-mail wanneer support een (niet-interne) reactie plaatst
// op hun ticket. Alleen als het contact een e-mailadres heeft. Verzending loopt
// via after() zodat het API-antwoord niet vertraagt en een mailfout de reactie
// zelf niet laat mislukken. Buiten request-context valt het terug op awaiten.
export function notifyContactOfReply(params: {
  ticketId: string;
  ticketNumber: number;
  subject: string;
  contactEmail: string | null | undefined;
  contactName: string;
  staffName: string;
  message: string;
}) {
  const { ticketId, ticketNumber, subject, contactEmail, contactName, staffName, message } =
    params;

  if (!contactEmail) return; // geen e-mailadres bekend -> alleen zichtbaar in portaal

  const ticketUrl = `${APP_URL}/nl/portal/tickets/${ticketId}`;
  const safeMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#1a1a1a;">Nieuwe reactie op uw melding</h2>
      <p>Beste ${contactName},</p>
      <p>${staffName} heeft gereageerd op ticket <strong>#${ticketNumber} — ${subject}</strong>:</p>
      <blockquote style="margin:16px 0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #0f172a;border-radius:4px;white-space:pre-wrap;">${safeMessage}</blockquote>
      <p>
        <a href="${ticketUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Bekijk en reageer in het portaal
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:12px;">${APP_NAME} Klantenportaal</p>
    </div>
  `;

  const send = () =>
    sendEmail({
      to: contactEmail,
      subject: `Reactie op uw melding #${ticketNumber} — ${subject}`,
      html,
    }).catch((err) => console.error("[portal-notify] mail mislukt:", err));

  try {
    after(send);
  } catch {
    void send();
  }
}
