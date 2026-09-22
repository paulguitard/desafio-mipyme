import nodemailer from "nodemailer";

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendMailResult =
  | { ok: true }
  | { ok: false; error: string; notConfigured?: boolean };

export function isMailConfigured() {
  return Boolean(
    process.env.MAIL_FROM?.trim() &&
      process.env.MAIL_SMTP_USER?.trim() &&
      process.env.MAIL_SMTP_PASS?.trim(),
  );
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const from = process.env.MAIL_FROM?.trim();
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Desafío AIEP";
  const user = process.env.MAIL_SMTP_USER?.trim();
  const pass = process.env.MAIL_SMTP_PASS?.trim();
  const host = process.env.MAIL_SMTP_HOST?.trim() || "smtp.office365.com";
  const port = Number(process.env.MAIL_SMTP_PORT?.trim() || "587");

  if (!from || !user || !pass) {
    console.warn(
      "[mail] MAIL_FROM / MAIL_SMTP_USER / MAIL_SMTP_PASS no configurados; no se envió correo.",
    );
    return {
      ok: false,
      notConfigured: true,
      error:
        "El envío de correo no está configurado (faltan MAIL_FROM, MAIL_SMTP_USER o MAIL_SMTP_PASS).",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"${fromName.replaceAll('"', "")}" <${from}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mail] SMTP error", message.slice(0, 400));

    if (/SmtpClientAuthentication is disabled/i.test(message)) {
      return {
        ok: false,
        error:
          "Microsoft 365 tiene SMTP AUTH deshabilitado para esta casilla. Hay que habilitarlo o usar otro método de envío.",
      };
    }
    if (/Invalid login|authentication failed|535/i.test(message)) {
      return {
        ok: false,
        error:
          "No se pudo autenticar en Outlook (usuario/contraseña o app password). Revisá MAIL_SMTP_USER y MAIL_SMTP_PASS.",
      };
    }

    return {
      ok: false,
      error: "No se pudo enviar el correo. Intentá de nuevo más tarde.",
    };
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
