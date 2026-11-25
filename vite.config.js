import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { ICON_SVG } from './src/assets/icon.js';
import { MATCH_PATTERNS } from './src/core/sites.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      build: { fileName: 'pornhub-tools.user.js' },
      userscript: {
        name: 'PornhubTools',
        namespace: 'https://github.com/sherlocknieh/',
        version: '2026.11.25.1459',
        description: '增强一些XX网站的浏览体验',
        icon: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICON_SVG),
        match: MATCH_PATTERNS,
        grant: 'none',
      },
    }),
  ],
});
