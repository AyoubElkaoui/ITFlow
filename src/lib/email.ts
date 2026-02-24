import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@itfin.nl";
const APP_NAME = "ITFlow";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function sendPortalInvite(params: {
  to: string;
  contactName: string;
  companyName: string;
  password: string;
}) {
  const { to, contactName, companyName, password } = params;
  const portalUrl = `${APP_URL}/nl/portal/login`;

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject: `${APP_NAME} - Uw portaal toegang voor ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Welkom bij het ${APP_NAME} Klantenportaal</h2>
        <p>Beste ${contactName},</p>
        <p>Er is een portaalaccount aangemaakt voor <strong>${companyName}</strong>. Hiermee kunt u tickets inzien, aanmaken en opvolgen.</p>
        <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 8px;"><strong>Inloggegevens:</strong></p>
          <p style="margin: 0 0 4px;">E-mail: <code>${to}</code></p>
          <p style="margin: 0;">Wachtwoord: <code>${password}</code></p>
        </div>
        <p>
          <a href="${portalUrl}" style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Inloggen op het portaal
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Wijzig uw wachtwoord na de eerste keer inloggen. Neem contact met ons op als u vragen heeft.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">${APP_NAME} &mdash; ${companyName}</p>
      </div>
    `,
  });
}

export async function sendTicketNotification(params: {
  to: string;
  contactName: string;
  ticketNumber: number;
  ticketSubject: string;
  message?: string;
}) {
  const { to, contactName, ticketNumber, ticketSubject, message } = params;

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject: `[Ticket #${ticketNumber}] ${ticketSubject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Update voor Ticket #${ticketNumber}</h2>
        <p>Beste ${contactName},</p>
        <p>Er is een update op uw ticket: <strong>${ticketSubject}</strong></p>
        ${message ? `<div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;"><p style="margin: 0;">${message}</p></div>` : ""}
        <p>
          <a href="${APP_URL}/nl/portal/tickets" style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Bekijk in portaal
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">${APP_NAME}</p>
      </div>
    `,
  });
}

export { transporter };
