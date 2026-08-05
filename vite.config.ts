import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Chunking is left to Rollup deliberately.
 *
 * An earlier version split vendors by package (`vendor-react`, `vendor-query`,
 * `vendor-chain`, …). It produced a much smaller entry chunk but shipped a
 * broken app: hand-drawn chunk boundaries cut through cyclic imports between
 * these packages, and the resulting cross-chunk initialisation order threw
 * `Cannot access 'wr' before initialization` at startup — a blank page.
 *
 * The failure only appeared in the wallet build, where the dependency graph is
 * dense enough to contain such a cycle; the read-only build was fine. If manual
 * chunking is reintroduced, it MUST be verified against a wallet build in a real
 * browser, not just typechecked.
 *
 * Route-level `lazy()` in App.tsx gives most of the benefit without partitioning
 * the vendor graph, because Rollup derives those boundaries from actual dynamic
 * imports rather than from a guess.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // The wallet stack is legitimately large; keep the warning meaningful for
    // application code rather than firing on a known-heavy dependency.
    chunkSizeWarningLimit: 1800,
  },
});
