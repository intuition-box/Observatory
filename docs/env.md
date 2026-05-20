# Environment Variables

Single source of truth: `src/config/env.ts` (zod-validated at boot).
Any new env var must be added to `.env.example` and to this table in the same commit.

| Name | Required | Default | Description | Used in |
|------|----------|---------|-------------|---------|
| `VITE_CHAIN_ID` | yes | — | Intuition chain ID. `1155` (mainnet) or `13579` (testnet). | `src/config/env.ts` |
| `VITE_RPC_URL` | yes | — | RPC endpoint for the selected chain. | `src/config/env.ts` |
| `VITE_GRAPHQL_URL` | yes | — | Intuition indexer GraphQL endpoint. Used for both read queries and IPFS pinning mutations (see ADR-004). | `src/config/env.ts` |
| `VITE_MULTIVAULT_ADDRESS` | yes | — | MultiVault contract address (`0x` + 40 hex). | `src/config/env.ts` |
| `VITE_WALLETCONNECT_PROJECT_ID` | yes | — | WalletConnect Cloud project ID (free at https://cloud.walletconnect.com). Required by RainbowKit's `getDefaultConfig`. | `src/config/env.ts` |

Derived (not env vars, computed from `VITE_CHAIN_ID`):

| Name | Description |
|------|-------------|
| `env.networkName` | `'mainnet'` (chain 1155) or `'testnet'` (chain 13579). |

## Network defaults

### Mainnet (chain `1155`)

```
VITE_CHAIN_ID=1155
VITE_RPC_URL=https://rpc.intuition.systems
VITE_GRAPHQL_URL=https://mainnet.intuition.sh/v1/graphql
VITE_MULTIVAULT_ADDRESS=0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e
```

### Testnet (chain `13579`) — used during development

```
VITE_CHAIN_ID=13579
VITE_RPC_URL=https://testnet.rpc.intuition.systems
VITE_GRAPHQL_URL=https://testnet.intuition.sh/v1/graphql
VITE_MULTIVAULT_ADDRESS=0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91
```

## Adding a new env var

1. Add a row to the table above.
2. Add the var to `.env.example` with a comment.
3. Add validation in `src/config/env.ts` (zod schema + export through `env`).
4. Reference via `import { env } from '<relative>/config/env'` — never via `import.meta.env.*` directly.
