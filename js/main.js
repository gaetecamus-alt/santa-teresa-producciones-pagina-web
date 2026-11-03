// Parallax del hero (solo en la home)
const heroBg = document.getElementById('heroBg');
if (heroBg) {
  window.addEventListener('scroll', () => {
    heroBg.style.transform = `scale(1.04) translateY(${window.scrollY * 0.25}px)`;
  }, { passive: true });
}

// Animación de entrada. Si el navegador no soporta IntersectionObserver,
// se muestra todo de inmediato.
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('visible'));
}

// ── Medición: eventos para GTM (GA4, Google Ads, Meta) ──
window.dataLayer = window.dataLayer || [];
const pageService = location.pathname.replace(/^\/|\.html$|\/$/g, '') || 'home';
const track = (event, params = {}) => window.dataLayer.push({ event, page_service: pageService, ...params });

const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};
const TTL = 90 * 24 * 60 * 60 * 1000;

// Origen de la visita (primera parte, 90 días): se guarda el último origen no directo,
// para que el formulario y el código de WhatsApp sepan de qué campaña/keyword vino el lead.
const ATTR_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const attribution = (() => {
  const params = new URLSearchParams(location.search);
  const fromUrl = {};
  ATTR_KEYS.forEach(k => { const v = params.get(k); if (v) fromUrl[k] = v.slice(0, 200); });
  let referrer = '';
  try {
    if (document.referrer && !new URL(document.referrer).hostname.endsWith('steresa.cl')) referrer = document.referrer.slice(0, 200);
  } catch {}

  if (Object.keys(fromUrl).length || referrer) {
    const a = { ...fromUrl, referrer, landing: location.pathname, ts: Date.now() };
    if (!a.utm_source && (a.gclid || a.gbraid || a.wbraid)) Object.assign(a, { utm_source: 'google', utm_medium: 'cpc' });
    else if (!a.utm_source && a.fbclid) Object.assign(a, { utm_source: 'facebook', utm_medium: 'social' });
    store.set('st_attr', a);
    return a;
  }
  const saved = store.get('st_attr');
  return saved && Date.now() - saved.ts < TTL ? saved : { landing: location.pathname };
})();

// Código de referencia por visitante (90 días) que viaja al final del mensaje de WhatsApp
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function getRef() {
  const saved = store.get('st_ref');
  if (saved && Date.now() - saved.ts < TTL) return saved.ref;
  const ref = [...crypto.getRandomValues(new Uint8Array(4))].map(b => REF_ALPHABET[b % 32]).join('');
  store.set('st_ref', { ref, ts: Date.now() });
  return ref;
}

function linkLocation(el) {
  if (el.closest('.wa-float')) return 'flotante';
  if (el.closest('.faq-a')) return 'faq';
  if (el.closest('footer')) return 'footer';
  if (el.closest('.cta-band')) return 'cta_final';
  if (el.closest('#hero, .page-hero')) return 'hero';
  if (el.closest('#contacto')) return 'contacto';
  if (el.closest('nav')) return 'nav';
  return 'otro';
}

// Registra en el Worker el ref con su origen; al cerrar una venta por WhatsApp se busca el
// ref del chat para obtener el gclid y subir la conversión offline a Google Ads.
function saveLeadRef(ref, where) {
  const { ts, ...attr } = attribution;
  const body = JSON.stringify({ ref, page: location.pathname, link_location: where, ...attr });
  try {
    if (!navigator.sendBeacon('/api/lead-ref', new Blob([body], { type: 'application/json' }))) throw 0;
  } catch {
    fetch('/api/lead-ref', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  }
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.href;
  const where = linkLocation(a);

  if (href.startsWith('https://wa.me/')) {
    const ref = getRef();
    const url = new URL(href);
    const text = url.searchParams.get('text') || '';
    if (!/\(Ref: [A-Z2-9]{4}\)$/.test(text)) {
      url.search = '?text=' + encodeURIComponent(`${text} (Ref: ${ref})`);
      a.href = url.toString();
    }
    track('whatsapp_click', { link_location: where, wa_ref: ref });
    saveLeadRef(ref, where);
  } else if (/cloudfront\.net\/steresa\/.+\.pdf$/i.test(href)) {
    track('catalog_download', { link_location: where });
  } else if (href.startsWith('mailto:')) {
    track('email_click', { link_location: where });
  } else if (href.includes('instagram.com/')) {
    track('instagram_click', { link_location: where });
  }
});

// Formulario de contacto (Web3Forms), solo existe en la home
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  // Campos ocultos: cada correo de cotización llega con su origen y keyword
  const setField = (name, value) => { const input = contactForm.querySelector(`input[name="${name}"]`); if (input) input.value = value || ''; };
  let origen = [attribution.utm_source, attribution.utm_medium].filter(Boolean).join(' / ');
  if (!origen) { try { origen = attribution.referrer ? new URL(attribution.referrer).hostname : 'directo'; } catch { origen = 'directo'; } }
  setField('origen', origen);
  setField('campana', attribution.utm_campaign);
  setField('keyword', attribution.utm_term);
  setField('gclid', attribution.gclid || attribution.gbraid || attribution.wbraid);
  setField('pagina_entrada', attribution.landing);

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const ref = getRef();
    setField('referencia', ref);
    const btn = form.querySelector('button[type=submit]');
    btn.textContent = 'Enviando...';
    btn.disabled = true;
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', body: new FormData(form)
      });
      const data = await res.json();
      if (data.success) {
        // Solo se cuenta el lead cuando Web3Forms confirma el envío
        track('generate_lead', {
          form_name: 'cotizacion',
          event_type: form.tipo.value.trim().slice(0, 100),
          wa_ref: ref,
          user_data: { email: form.email.value.trim().toLowerCase() },
        });
        form.style.display = 'none';
        document.getElementById('formSuccess').style.display = 'block';
      } else {
        btn.textContent = 'Error al enviar. Intenta de nuevo.';
        btn.disabled = false;
      }
    } catch {
      btn.textContent = 'Error de conexión. Intenta de nuevo.';
      btn.disabled = false;
    }
  });
}
