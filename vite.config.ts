import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Split heavy, independently-cacheable dependencies out of the entry chunk.
 *
 * The wallet stack (Privy + wagmi + viem) dominates this app's bundle but is
 * only needed to *write* claims — reading the ontology needs none of it. Giving
 * it its own chunks means a visitor who never connects a wallet still downloads
 * it, but the browser can fetch chunks in parallel, cache them across deploys,
 * and parse the entry chunk far sooner.
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;

  // d3 is only used by the visualisations.
  if (id.includes('/d3-') || id.includes('/d3/')) return 'vendor-d3';

  // Wallet + chain stack.
  if (id.includes('@privy-io')) return 'vendor-privy';
  if (id.includes('/wagmi/') || id.includes('@wagmi/')) return 'vendor-wagmi';
  if (id.includes('/viem/') || id.includes('/ox/') || id.includes('@walletconnect') || id.includes('@reown')) {
    return 'vendor-chain';
  }

  // Canonical vocabulary — pure data, changes only on an alpha bump.
  if (id.includes('@0xintuition')) return 'vendor-intuition';

  if (id.includes('@tanstack')) return 'vendor-query';
  if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/react-router')) {
    return 'vendor-react';
  }

  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: { manualChunks },
    },
    // The wallet vendor chunks are legitimately large; warn only above them so
    // the signal stays useful for application code.
    chunkSizeWarningLimit: 900,
  },
});
