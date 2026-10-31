(() => {
  const tour = document.querySelector('.solution-tour');
  if (!tour) return;
  const tabs = [...tour.querySelectorAll('[role="tab"]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let animation;
  function select(index, moveFocus = false) {
    animation?.cancel();
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
    const panel = document.getElementById(tabs[index].getAttribute('aria-controls'));
    if (moveFocus) tabs[index].focus({ preventScroll: true });
    if (!reducedMotion.matches) animation = panel.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 160 });
    // Re-measure responsive diagrams now their panel is visible.
    window.dispatchEvent(new CustomEvent('workflow:change', { detail: { panel: panel.id } }));
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      const columns = getComputedStyle(tab.parentElement).gridTemplateColumns.split(' ').length;
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'ArrowDown') next = (index + columns) % tabs.length;
      if (event.key === 'ArrowUp') next = (index + tabs.length - columns) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(next, true); }
    });
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) animation?.cancel(); });
})();
