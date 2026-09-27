import { defineConfig } from 'vite';

// YukiOS-like static site: works on Netlify/Vercel/GitHub Pages
// For GitHub Pages project site, set base to '/cinmin-desktop/' automatically
const isGitHubPages = process.env.GITHUB_REPOSITORY?.includes('cinmin-desktop');

export default defineConfig({
  base: isGitHubPages ? '/cinmin-desktop/' : './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      external: (id) => id === 'electron',
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
