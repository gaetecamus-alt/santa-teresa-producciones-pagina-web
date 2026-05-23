# Santa Teresa Producciones — Sitio Web

Sitio web oficial de **Santa Teresa Producciones**, productora de eventos premium ubicada en Buin, Región Metropolitana, Chile.

## Descripción

Página institucional de una sola página (single-page) que presenta los servicios de producción integral de eventos: arriendo de mobiliario premium, carpas stretch, decoración, matrimonios, eventos corporativos y producción técnica.

## Estructura del repositorio

```
/
├── index.html          # Sitio web completo (HTML + CSS + JS inline)
├── img/                # Imágenes del sitio (hero, galería, logos)
├── sitemap.xml         # Sitemap con imágenes para Google
├── robots.txt          # Directivas para motores de búsqueda
├── src/
│   └── index.ts        # Cloudflare Worker — manejo de emails del formulario
├── wrangler.jsonc      # Configuración del Worker (Cloudflare)
├── package.json        # Dependencias del Worker
└── tsconfig.json       # Configuración TypeScript
```

## Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript vanilla — sin frameworks ni dependencias
- **Tipografías:** Cormorant Garamond + Montserrat (Google Fonts)
- **Hosting:** Cloudflare Pages
- **Email:** Cloudflare Workers + Email Routing → `contacto@steresa.cl`
- **Dominio:** [steresa.cl](https://steresa.cl)

## Deploy

El sitio se despliega automáticamente en Cloudflare Pages al hacer push a `main`.

El Worker de email se despliega con:

```bash
npm install
npx wrangler deploy
```

## Contacto

- Email: contacto@steresa.cl
- Instagram: [@santateresaproducciones](https://instagram.com/santateresaproducciones)
- Ubicación: Buin, Región Metropolitana, Chile
