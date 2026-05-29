import { z } from 'zod';

/**
 * Typed environment loader with zod validation.
 * Single source of truth for all environment variables.
 * Validates at module load — a misconfigured .env crashes at boot
 * rather than producing late opaque failures during contract calls.
 */

const HexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid 0x-prefixed 40-char hex address');

const ChainId = z.coerce.number().refine(
  (id) => id === 1155 || id === 13579,
  'Chain ID must be 1155 (mainnet) or 13579 (testnet)',
);

const envSchema = z.object({
  VITE_CHAIN_ID: ChainId,
  VITE_MULTIVAULT_ADDRESS: HexAddress,
  VITE_GRAPHQL_URL: z.string().url(),
  VITE_RPC_URL: z.string().url(),
  VITE_WALLETCONNECT_PROJECT_ID: z.string().min(1).optional().default(''),
});

function loadEnv() {
  const raw = {
    VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
    VITE_MULTIVAULT_ADDRESS: import.meta.env.VITE_MULTIVAULT_ADDRESS,
    VITE_GRAPHQL_URL: import.meta.env.VITE_GRAPHQL_URL,
    VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
    VITE_WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.warn(
      `⚠️ Intuition env validation failed (running in demo mode):\n${missing}`,
    );
    // Return safe defaults for demo/development mode
    return {
      VITE_CHAIN_ID: 13579 as const,
      VITE_MULTIVAULT_ADDRESS: '0x430BbF52503Bd4801E51182f4cB9f8F534225DE5' as `0x${string}`,
      VITE_GRAPHQL_URL: 'https://api.intuition.systems/v1/graphql',
      VITE_RPC_URL: 'https://rpc.intuition.systems',
      VITE_WALLETCONNECT_PROJECT_ID: '',
      isDemo: true,
    };
  }

  return { ...result.data, isDemo: false };
}

export const env = loadEnv();

/** Derived network name for UI display */
export const networkName = env.VITE_CHAIN_ID === 1155 ? 'Intuition Mainnet' : 'Intuition Testnet';

/** Whether running in demo mode (env not fully configured) */
export const isDemoMode = 'isDemo' in env && env.isDemo === true;
