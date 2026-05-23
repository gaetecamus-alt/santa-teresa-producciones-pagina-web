import { EmailMessage } from "cloudflare:email";

interface Env {
  SEND_EMAIL: SendEmail;
}

function buildRawEmail(from: string, to: string, subject: string, body: string): string {
  const boundary = `----=_boundary_${Date.now()}`;
  return [
    `From: Santa Teresa Producciones <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
  ].join("\r\n");
}

export default {
  // Handle incoming emails (Email Routing)
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    console.log(`Incoming email from=${message.from} to=${message.to}`);
    await message.forward("contacto@steresa.cl");
  },

  // Handle HTTP requests (contact form submissions)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://steresa.cl",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json<{
        nombre: string;
        email: string;
        empresa?: string;
        tipo?: string;
        detalle: string;
      }>();

      const { nombre, email, empresa, tipo, detalle } = body;

      if (!nombre || !email || !detalle) {
        return Response.json(
          { success: false, message: "Campos requeridos faltantes" },
          { status: 400, headers: corsHeaders }
        );
      }

      console.log(`Contact form submission from=${email} nombre=${nombre}`);

      const bodyText = [
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        empresa ? `Empresa: ${empresa}` : null,
        tipo ? `Tipo de evento: ${tipo}` : null,
        ``,
        `Detalle:`,
        detalle,
      ]
        .filter(Boolean)
        .join("\n");

      const raw = buildRawEmail(
        "noreply@steresa.cl",
        "contacto@steresa.cl",
        `Nueva cotización de ${nombre}`,
        bodyText
      );

      const emailMessage = new EmailMessage("noreply@steresa.cl", "contacto@steresa.cl", raw);
      await env.SEND_EMAIL.send(emailMessage);

      return Response.json({ success: true }, { headers: corsHeaders });
    } catch (err) {
      console.error("Error sending email:", err);
      return Response.json(
        { success: false, message: "Error interno" },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
