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

// Formulario de contacto (Web3Forms), solo existe en la home
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  btn.textContent = 'Enviando...';
  btn.disabled = true;
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST', body: new FormData(form)
    });
    const data = await res.json();
    if (data.success) {
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
