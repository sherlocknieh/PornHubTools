import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { ICON_SVG } from './src/assets/icon.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      build: { fileName: 'pornhub-tools.user.js' },
      userscript: {
        name: 'PornhubTools',
        namespace: 'https://github.com/sherlocknieh/',
        version: '2026.11.15.1542',
        description: '增强一些XX网站的浏览体验',
        icon: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICON_SVG),
        match: [
          'https://greasyfork.org/*',
          'https://sleazyfork.org/*',
          'https://*.pornhub.com/*',
          'https://musedam.cc/*',
          'https://nsfw.xxx/*',
          'https://rule34.xxx/*',
          'https://anacams.com/post/*',
          'https://www.tekjam.com/album/*',
          'https://*.elitebabes.com/*',
          'https://*.hotnakedwomen.com/*',
          'https://*.hdpornpictures.com/*',
          'https://*.pornpics.com/*'
        ],
        grant: 'none',
      },
    }),
  ],
});
