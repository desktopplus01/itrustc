import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves project sites at /<repo-name>/ — derive the base from
// the CI environment (GITHUB_REPOSITORY) so it follows repo renames. Vercel
// serves at the domain root, so base must be "/" there (Vercel sets VERCEL=1
// during builds). Local dev falls back to this repo's name for GH Pages parity.
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] || "itrustc";
const base = process.env.VERCEL ? "/" : `/${repo}/`;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
  server: {
    proxy: {
      '/itrustc/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/itrustc/, ''),
      },
    },
  },
});
