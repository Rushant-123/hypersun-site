const siteNav = document.querySelector('body > nav');
const navToggle = siteNav.querySelector('.nav-toggle');
const closeNav = () => {
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open navigation');
};
navToggle.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
siteNav.querySelectorAll('.links a').forEach(link => link.addEventListener('click', closeNav));
document.addEventListener('click', event => {
  if (!siteNav.contains(event.target)) closeNav();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
    closeNav();
    navToggle.focus();
  }
});
matchMedia('(max-width:600px)').addEventListener('change', closeNav);
