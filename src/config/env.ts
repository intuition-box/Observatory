import { z } from 'zod';

/**
 * Single source of truth for environment variables.
 *
 * Validated at module load. Invalid configuration crashes the app at boot
 * with a developer-friendly diagnostic — the only place in the codebase
 * permitted to read `import.meta.env` directly.
 */

const HEX_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const EnvSchema = z.object({
  VITE_CHAIN_ID: z
    .enum(['1155', '13579'])
    // boundary: zod-enum guarantees the runtime value is one of the two literals
    .transform((value) => Number(value) as 1155 | 13579),
  VITE_RPC_URL: z.string().url(),
  VITE_GRAPHQL_URL: z.string().url(),
  VITE_MULTIVAULT_ADDRESS: z
    .string()
    .regex(HEX_ADDRESS_REGEX, 'must be a 0x-prefixed 40-char hex address')
    // boundary: zod-validated string narrowed to the 0x-prefixed template type
    .transform((value) => value as `0x${string}`),
  VITE_WALLETCONNECT_PROJECT_ID: z
    .string()
    .min(1, 'register a free project ID at https://cloud.walletconnect.com'),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Invalid environment configuration:\n${issues}\n\nSee .env.example for the required variables.`
  );
}

const NETWORK_NAME_BY_CHAIN_ID = {
  1155: 'mainnet',
  13579: 'testnet',
} as const satisfies Record<1155 | 13579, string>;

export const env = {
  chainId: parsed.data.VITE_CHAIN_ID,
  rpcUrl: parsed.data.VITE_RPC_URL,
  graphqlUrl: parsed.data.VITE_GRAPHQL_URL,
  multivaultAddress: parsed.data.VITE_MULTIVAULT_ADDRESS,
  walletConnectProjectId: parsed.data.VITE_WALLETCONNECT_PROJECT_ID,
  networkName: NETWORK_NAME_BY_CHAIN_ID[parsed.data.VITE_CHAIN_ID],
} as const;

export type Env = typeof env;
