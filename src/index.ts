import { EmailMessage } from "cloudflare:email";

interface Env {
  SEND_EMAIL: SendEmail;
  ASSETS: Fetcher;
  LEAD_REFS: KVNamespace;
  EXPORT_TOKEN?: string;
}

// Código de referencia agregado al mensaje de WhatsApp: 4 caracteres sin 0/O/1/I
const REF_RE = /^[A-HJ-NP-Z2-9]{4}$/;
const LEAD_REF_FIELDS = [
  "gclid", "gbraid", "wbraid", "fbclid",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "landing", "referrer", "page", "link_location",
] as const;
const LEAD_REF_TTL = 180 * 24 * 60 * 60;

// POST /api/lead-ref — guarda el origen de un clic a WhatsApp. No recibe datos personales.
async function saveLeadRef(request: Request, url: URL, env: Env): Promise<Response> {
  if (request.headers.get("Origin") !== url.origin) {
    return new Response("Forbidden", { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > 2048) return new Response("Payload too large", { status: 413 });

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const ref = String(data.ref ?? "");
  if (!REF_RE.test(ref)) return new Response("Bad request", { status: 400 });

  const record: Record<string, string> = { ts: new Date().toISOString(), ref };
  for (const field of LEAD_REF_FIELDS) {
    const value = data[field];
    if (typeof value === "string" && value) record[field] = value.slice(0, 200);
  }
  // Una clave por ref y día: varios clics del mismo visitante no gastan escrituras
  const day = record.ts.slice(0, 10);
  await env.LEAD_REFS.put(`ref:${ref}:${day}`, JSON.stringify(record), { expirationTtl: LEAD_REF_TTL });
  return new Response(null, { status: 204 });
}

async function tokenMatches(given: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// GET /api/lead-refs.csv — exporta los refs (Authorization: Bearer <EXPORT_TOKEN>)
async function exportLeadRefs(request: Request, env: Env): Promise<Response> {
  if (!env.EXPORT_TOKEN) return new Response("Export not configured", { status: 503 });
  const auth = request.headers.get("Authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!given || !(await tokenMatches(given, env.EXPORT_TOKEN))) {
    return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.LEAD_REFS.list({ prefix: "ref:", cursor });
    keys.push(...page.keys.map((k) => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const records = (await Promise.all(keys.map((k) => env.LEAD_REFS.get<Record<string, string>>(k, "json"))))
    .filter((r): r is Record<string, string> => r !== null)
    .sort((a, b) => b.ts.localeCompare(a.ts));

  const columns = ["ts", "ref", ...LEAD_REF_FIELDS];
  const lines = [columns.join(","), ...records.map((r) => columns.map((c) => csvCell(r[c] ?? "")).join(","))];
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lead-refs.csv"',
      "Cache-Control": "no-store",
    },
  });
}

function buildRawEmail(from: string, to: string, subject: string, body: string): string {
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

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Dominio canónico: www.steresa.cl → steresa.cl (evita contenido duplicado)
    if (url.hostname === "www.steresa.cl") {
      url.hostname = "steresa.cl";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/lead-ref") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      return saveLeadRef(request, url, env);
    }

    if (url.pathname === "/api/lead-refs.csv") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      return exportLeadRefs(request, env);
    }

    // Only intercept POST /api/contact — everything else served as static asset
    if (url.pathname === "/api/contact") {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "https://steresa.cl",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
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

        console.log(`Contact form from=${email} nombre=${nombre}`);

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
    }

    // All other requests → serve static assets (index.html, img/, etc.)
    return env.ASSETS.fetch(request);
  },
};
