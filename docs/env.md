# Environment Variables

Single source of truth: `src/config/env.ts` (zod-validated at boot).
Template: `.env.example`.

## Required Variables

| Name | Type | Description |
|------|------|-------------|
| `VITE_CHAIN_ID` | `1155 \| 13579` | Intuition chain ID. `1155` = mainnet, `13579` = testnet. |
| `VITE_RPC_URL` | URL | JSON-RPC endpoint for the selected chain. |
| `VITE_GRAPHQL_URL` | URL | Intuition indexer GraphQL endpoint. |
| `VITE_MULTIVAULT_ADDRESS` | `0x...` (40 hex) | MultiVault contract address. |
| `VITE_WALLETCONNECT_PROJECT_ID` | string | WalletConnect Cloud project ID for RainbowKit. |

## Optional Variables

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `VITE_IPFS_PIN_ENDPOINT` | URL | (graphql url) | Separate IPFS pinning endpoint, if different from indexer. |

## Derived Values (computed, not env vars)

| Name | Source | Description |
|------|--------|-------------|
| `env.networkName` | `VITE_CHAIN_ID` | `'mainnet'` (1155) or `'testnet'` (13579) |
| `isDemoMode` | env parse result | `true` if any required var is missing |

## Network Presets

### Mainnet (chain `1155`)

```env
VITE_CHAIN_ID=1155
VITE_RPC_URL=https://rpc.intuition.systems/http
VITE_GRAPHQL_URL=https://mainnet.intuition.sh/v1/graphql
VITE_MULTIVAULT_ADDRESS=0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
```

### Testnet (chain `13579`)

```env
VITE_CHAIN_ID=13579
VITE_RPC_URL=https://testnet.rpc.intuition.systems/http
VITE_GRAPHQL_URL=https://testnet.intuition.sh/v1/graphql
VITE_MULTIVAULT_ADDRESS=0x78277F0e6237AB8bBab7F45c62F7e80eb7e4dd0d
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
```

## Demo Mode

When `.env` is missing or incomplete, the app boots in **demo mode**:

- ✅ All read-only UI features work (claim builder, graph, matrix)
- ✅ Static data from `src/data/` is used as fallback
- ❌ Wallet connection is disabled
- ❌ On-chain submission is disabled
- ⚠️ A visible "DEMO" badge appears in the header

This allows `git clone && npm run dev` without any configuration.

## Adding New Variables

1. Add to `.env.example` with a comment
2. Add to this table
3. Add to the zod schema in `src/config/env.ts`
4. Import from `env` object — never read `import.meta.env` directly
