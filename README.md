# Santa Teresa Producciones — Sitio Web

Sitio web oficial de **Santa Teresa Producciones**, productora de eventos y empresa de arriendo para eventos con base en Buin, Región Metropolitana, Chile.

## Descripción

Sitio estático con una home y una landing por servicio, optimizado para SEO local (Región Metropolitana) y para buscadores con IA (GEO): schema.org, FAQ visibles con su `FAQPage`, `llms.txt` y bots de IA permitidos en `robots.txt`.

## Estructura del repositorio

```
/
├── index.html                              # Home
├── arriendo-carpas-eventos.html            # /arriendo-carpas-eventos
├── arriendo-mobiliario-eventos.html        # /arriendo-mobiliario-eventos
├── arriendo-equipamiento-gastronomico.html # /arriendo-equipamiento-gastronomico
├── banqueteria-catering.html               # /banqueteria-catering
├── matrimonios.html                        # /matrimonios
├── eventos-corporativos.html               # /eventos-corporativos
├── 404.html                                # Página de error (status 404)
├── politica-de-privacidad.html             # /politica-de-privacidad
├── css/styles.css                          # Estilos compartidos
├── js/main.js                              # Animaciones, formulario y medición (dataLayer, origen, Ref de WhatsApp)
├── img/                                    # Imágenes (.webp publicadas; .jpg/.png originales no se publican)
├── llms.txt                                # Resumen del negocio para asistentes de IA
├── sitemap.xml / robots.txt
├── src/index.ts                            # Worker: redirect www → apex, /api/contact, /api/lead-ref, /api/lead-refs.csv, email
├── gtm-steresa-contenedor.json             # Respaldo importable del contenedor de GTM (no se publica)
└── wrangler.jsonc                          # Configuración del Worker y static assets
```

Nav, footer y botón de WhatsApp están **duplicados en cada página** (HTML estático, sin build). Si cambias el teléfono, un enlace del menú o el footer, actualízalo en todos los `.html`.

Cada landing tiene su FAQ visible y un `FAQPage` en el `<head>` con **exactamente las mismas preguntas**: si editas una, edita la otra.

## Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript vanilla — sin frameworks ni dependencias
- **Tipografías:** Cormorant Garamond + Montserrat (Google Fonts)
- **Hosting:** Cloudflare Workers con static assets (cuenta `maldunate0@gmail.com`)
- **Formulario:** Web3Forms
- **Email:** Cloudflare Email Routing → `contacto@steresa.cl`
- **Dominio:** [steresa.cl](https://steresa.cl)

## Deploy

Producción se despliega automáticamente al hacer **push a `main`** en GitHub (build conectado de Cloudflare).

Para probar en local con URLs limpias y página 404 reales:

```bash
npm install
npx wrangler dev
```

> `wrangler dev` en la raíz entra en un bucle de recargas (escribe `.wrangler/` dentro del directorio de assets). Para probar, copia los archivos publicables a una carpeta aparte y apunta `assets.directory` ahí.

## Medición

Todo se gestiona desde **Google Tag Manager** (`GTM-N6JH2PZP`, cuenta Google maldunate0@gmail.com). El sitio solo carga GTM y empuja eventos a `dataLayer` desde `js/main.js`:

| Evento | Cuándo | Parámetros |
|---|---|---|
| `whatsapp_click` | Clic en cualquier link `wa.me` | `link_location` (hero, cta_final, contacto, footer, faq, flotante), `page_service`, `wa_ref` |
| `generate_lead` | Web3Forms confirma el envío del formulario | `form_name`, `event_type`, `wa_ref`, `user_data.email` |
| `catalog_download` | Clic en el PDF del catálogo | `link_location`, `page_service` |
| `email_click`, `instagram_click` | Clic en mailto / Instagram | `link_location`, `page_service` |

Destinos (configurados en GTM): GA4 `G-4YVQMVCEMK` (propiedad 562055813), Google Ads (conversiones Formulario, WhatsApp y Catálogo) y píxel de Meta (`Lead`, `Contact`, `ViewContent`).

**Origen del lead:** `main.js` guarda 90 días en el navegador el último origen no directo (`gclid`, `fbclid`, `utm_*`, página de entrada). El formulario lo envía en campos ocultos, así que cada correo de cotización trae origen, campaña, keyword y gclid.

**Código de referencia de WhatsApp:** al tocar WhatsApp, el mensaje termina en `(Ref: XXXX)` y el Worker guarda ese código con su origen en Cloudflare KV (`LEAD_REFS`, 180 días). Cuando un chat termina en venta:

1. Descarga el registro (el token está en `.dev.vars`, que no se sube a git ni al sitio):
   ```bash
   curl -H "Authorization: Bearer $(grep EXPORT_TOKEN .dev.vars | cut -d= -f2)" https://steresa.cl/api/lead-refs.csv -o lead-refs.csv
   ```
2. Busca el `Ref` del chat y copia su `gclid`.
3. En Google Ads → Objetivos → Conversiones → Subidas, sube la conversión **Venta cerrada** con ese gclid, la fecha y el valor de la venta.

Configurar el token (una sola vez, o para rotarlo):

```bash
TOKEN=$(openssl rand -hex 24) && printf 'EXPORT_TOKEN=%s\n' "$TOKEN" > .dev.vars && printf '%s' "$TOKEN" | CLOUDFLARE_ACCOUNT_ID=ca7b572159ffd0bb280bb1a719a468c1 npx wrangler secret put EXPORT_TOKEN
```

## Contacto

- WhatsApp: +56 9 9552 6920
- Email: contacto@steresa.cl
- Instagram: [@santateresaproducciones](https://instagram.com/santateresaproducciones)
- Ubicación: Buin, Región Metropolitana, Chile
