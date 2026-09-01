const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');

const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  document.body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  document.body.classList.remove('menu-open');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Open menu');
}));

document.querySelectorAll('form[data-success]').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault();
  const message = form.querySelector('.form-message');
  const submitButton = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  submitButton?.setAttribute('disabled', 'true');
  try {
    const res = await fetch('/api/contact', { method: 'POST', body: JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.error || 'Submission failed');
    if (message) { message.textContent = form.dataset.success; message.classList.remove('error'); }
    form.reset();
  } catch (err) {
    if (message) { message.textContent = `Something went wrong: ${err.message}`; message.classList.add('error'); }
  } finally {
    submitButton?.removeAttribute('disabled');
  }
}));

document.querySelectorAll('.faq-item button').forEach(button => button.addEventListener('click', () => {
  const item = button.closest('.faq-item');
  document.querySelectorAll('.faq-item').forEach(other => {
    if (other !== item) {
      other.classList.remove('open');
      const otherButton = other.querySelector('button');
      otherButton.setAttribute('aria-expanded', 'false');
      otherButton.querySelector('use')?.setAttribute('href', 'assets/icons.svg#plus');
    }
  });
  const open = item.classList.toggle('open');
  button.setAttribute('aria-expanded', String(open));
  button.querySelector('use')?.setAttribute('href', open ? 'assets/icons.svg#minus' : 'assets/icons.svg#plus');
}));

const showcaseData = {
  history: ['DAD REPORTS', 'Your health,', 'made simple.', '92', 'Health overview'],
  summary: ['AI VALUE', 'Summary report,', 'made clearer.', '90s', 'Key findings'],
  diagnostics: ['APPOINTMENT', 'Book a visit,', 'in under a minute.', '3', 'Simple steps']
};

document.querySelectorAll('[data-showcase]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-showcase]').forEach(tab => tab.classList.remove('active'));
  button.classList.add('active');
  const data = showcaseData[button.dataset.showcase];
  const screen = document.querySelector('.showcase-screen');
  if (!screen || !data) return;
  screen.querySelector('.tag').textContent = data[0];
  screen.querySelector('h3').innerHTML = `${data[1]}<br><em>${data[2]}</em>`;
  screen.querySelector('.metric-ring strong').textContent = data[3];
  screen.querySelector('.metric-ring small').textContent = data[4];
}));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  reveals.forEach(element => element.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px' });
  reveals.forEach(element => observer.observe(element));
}
