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
├── css/styles.css                          # Estilos compartidos
├── js/main.js                              # Animaciones y formulario de contacto
├── img/                                    # Imágenes (.webp publicadas; .jpg/.png originales no se publican)
├── llms.txt                                # Resumen del negocio para asistentes de IA
├── sitemap.xml / robots.txt
├── src/index.ts                            # Cloudflare Worker: redirect www → apex, /api/contact, email
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

## Contacto

- WhatsApp: +56 9 9552 6920
- Email: contacto@steresa.cl
- Instagram: [@santateresaproducciones](https://instagram.com/santateresaproducciones)
- Ubicación: Buin, Región Metropolitana, Chile
