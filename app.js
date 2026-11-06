const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');

// Highlight the menu link of the last section whose top has passed 40% of the screen height.
const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
const navSections = navLinks.map((link) => document.querySelector(link.hash));
const updateActiveLink = () => {
  let current = -1;
  navSections.forEach((section, i) => {
    if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.4) current = i;
  });
  navLinks.forEach((link, i) =>
    i === current ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current'),
  );
};

const updateHeader = () => {
  header?.classList.toggle('scrolled', window.scrollY > 24);
  updateActiveLink();
};
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const setMenu = (open) => {
  nav?.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
  menuButton?.setAttribute('aria-expanded', String(open));
  menuButton?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};

menuButton?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

document.querySelectorAll('form[data-success]').forEach((form) =>
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = form.querySelector('.form-message');
    const submitButton = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form));
    submitButton?.setAttribute('disabled', 'true');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || 'Submission failed');
      if (message) {
        message.textContent = form.dataset.success;
        message.classList.remove('error');
      }
      form.reset();
    } catch (err) {
      if (message) {
        message.textContent = `Your message was not sent. ${err.message}`;
        message.classList.add('error');
      }
    } finally {
      submitButton?.removeAttribute('disabled');
    }
  }),
);

document.querySelectorAll('.faq-item button').forEach((button) =>
  button.addEventListener('click', () => {
    const item = button.closest('.faq-item');
    document.querySelectorAll('.faq-item').forEach((other) => {
      if (other !== item) {
        other.classList.remove('open');
        const otherButton = other.querySelector('button');
        otherButton.setAttribute('aria-expanded', 'false');
        otherButton.querySelector('use')?.setAttribute('href', 'assets/icons.svg#plus');
      }
    });
    const open = item.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
    button
      .querySelector('use')
      ?.setAttribute('href', open ? 'assets/icons.svg#minus' : 'assets/icons.svg#plus');
  }),
);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  reveals.forEach((element) => element.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.12, rootMargin: '0px 0px -40px' },
  );
  reveals.forEach((element) => observer.observe(element));
}
