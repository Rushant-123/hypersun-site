const tabs = [...document.querySelectorAll('.product-tabs [role="tab"]')];
const tabList = document.querySelector('.product-tabs');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const indicator = document.createElement('span');
indicator.className = 'tab-indicator';
indicator.setAttribute('aria-hidden', 'true');
tabList.append(indicator);
tabList.classList.add('motion-ready');
let panelAnimations = [];
function positionIndicator() {
  const selected = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
  indicator.style.width = selected.offsetWidth + 'px';
  indicator.style.setProperty('--indicator-x', selected.offsetLeft + 'px');
  indicator.style.transform = `translateX(${selected.offsetLeft}px)`;
}
function animatePanel(panel) {
  panelAnimations.forEach(animation => animation.cancel());
  panelAnimations = [];
  if (reducedMotion.matches) return;
  const copy = panel.querySelector('.panel-copy');
  const visual = panel.lastElementChild;
  panelAnimations = [
    copy.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}], {duration:420,easing:'cubic-bezier(.2,.7,.2,1)'}),
    visual.animate([{opacity:.25,transform:'translateX(12px)'},{opacity:1,transform:'translateX(0)'}], {duration:620,easing:'cubic-bezier(.2,.7,.2,1)'})
  ];
}
function selectTab(selected, animate = true) {
  const changed = selected.getAttribute('aria-selected') !== 'true';
  tabs.forEach(tab => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  });
  positionIndicator();
  if (changed && animate) animatePanel(document.getElementById(selected.getAttribute('aria-controls')));
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(tabs[next]); tabs[next].focus(); }
  });
});
const linkedTab = tabs.find(tab => '#' + tab.id === location.hash);
if (linkedTab) selectTab(linkedTab, false);
positionIndicator();
new ResizeObserver(positionIndicator).observe(tabList);
document.fonts.ready.then(positionIndicator);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) panelAnimations.forEach(animation => animation.cancel());
});
// A single entrance when the product first comes into view; no looping motion.
const productEntrance = new IntersectionObserver(entries => {
  if (!entries.some(entry => entry.isIntersecting)) return;
  const selected = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
  animatePanel(document.getElementById(selected.getAttribute('aria-controls')));
  productEntrance.disconnect();
}, {threshold:.25});
productEntrance.observe(document.querySelector('.product-section'));

const dialog = document.querySelector('#film-dialog');
const video = dialog.querySelector('video');
document.querySelector('#watch').addEventListener('click', () => {
  dialog.showModal();
  document.body.classList.add('modal-open');
  video.play().catch(() => {});
});
document.querySelector('#close-film').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  video.pause();
  document.body.classList.remove('modal-open');
  document.querySelector('#watch').focus();
});
