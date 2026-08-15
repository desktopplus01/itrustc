import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves project sites at /<repo-name>/ — derive the base from
// the CI environment (GITHUB_REPOSITORY) so it follows repo renames, and
// fall back to this repo's name for local builds.
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] || "itrustc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: `/${repo}/`,
});
