import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

interface Env {
  SEND_EMAIL: SendEmail;
}

export default {
  // Handle incoming emails (Email Routing)
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    console.log(`Incoming email from=${message.from} to=${message.to}`);
    await message.forward("contacto@steresa.cl");
  },

  // Handle HTTP requests (contact form submissions)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://steresa.cl",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    };

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
        return Response.json({ success: false, message: "Campos requeridos faltantes" }, { status: 400, headers: corsHeaders });
      }

      console.log(`Contact form submission from=${email} nombre=${nombre}`);

      const msg = createMimeMessage();
      msg.setSender({ name: "Santa Teresa Producciones", addr: "noreply@steresa.cl" });
      msg.setRecipient("contacto@steresa.cl");
      msg.setSubject(`Nueva cotización de ${nombre}`);
      msg.addMessage({
        contentType: "text/plain",
        data: [
          `Nombre: ${nombre}`,
          `Email: ${email}`,
          empresa ? `Empresa: ${empresa}` : null,
          tipo ? `Tipo de evento: ${tipo}` : null,
          ``,
          `Detalle:`,
          detalle,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      const emailMessage = new EmailMessage("noreply@steresa.cl", "contacto@steresa.cl", msg.asRaw());
      await env.SEND_EMAIL.send(emailMessage);

      return Response.json({ success: true }, { headers: corsHeaders });
    } catch (err) {
      console.error("Error sending email:", err);
      return Response.json({ success: false, message: "Error interno" }, { status: 500, headers: corsHeaders });
    }
  },
};
