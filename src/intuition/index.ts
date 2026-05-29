/**
 * Intuition Protocol Integration Module
 * 
 * Self-contained module providing:
 * - Chain definitions for Intuition L3
 * - Branded types for type-safe contract interactions
 * - MultiVault ABI fragments
 * - Wagmi configuration
 * - GraphQL indexer service
 * - React hooks for reading/writing atoms and triples
 */

// Config
export { wagmiConfig, MULTIVAULT_ADDRESS } from './wagmi-config';
export { getIntuitionChain, intuitionMainnet, intuitionTestnet } from './chains';

// Types
export type {
  AtomId,
  TripleId,
  CurveId,
  IntuitionAtom,
  IntuitionTriple,
  IntuitionSessionState,
} from './types';
export { toAtomId, toTripleId, toCurveId } from './types';

// ABI
export { multivaultReadAbi, multivaultWriteAbi, multivaultAbi } from './abi/multivault';

// Services
export { getAtoms, getTriples, searchAtoms, getTriplesForAtom } from './services/graphql.service';
export { pinThing, pinPerson, pinOrganization, pinAtomData, isCaip10Address } from './services/ipfs.service';
export type { IpfsUri, ThingInput, PersonInput, OrganizationInput, AtomPinRequest } from './services/ipfs.service';

// Hooks
export { useIntuitionSession } from './hooks/use-intuition-session';
export { useAtoms, useSearchAtoms } from './hooks/use-atoms';
export { useTriples, useTriplesForAtom } from './hooks/use-triples';
export { useCreateAtom } from './hooks/use-create-atom';
export { useCreateTriple } from './hooks/use-create-triple';
