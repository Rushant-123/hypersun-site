// Builds assets/site.css. Rerun after adding Tailwind classes:
//   npx tailwindcss@3.4.17 -i tailwind.css -o assets/site.css --minify
module.exports = {
  content: ['./*.html', './demo/*.html', './assets/*.js'],
  corePlugins: { preflight: false },
  theme: { extend: { colors: { core: '#F6F8FF' }, fontFamily: { disp: ['"Big Shoulders Display"', 'Geist', 'sans-serif'], mono: ['"Geist Mono"', 'ui-monospace', 'monospace'], sans: ['Geist', 'system-ui', 'sans-serif'] } } }
};
