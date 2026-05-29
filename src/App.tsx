import { useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { isDemoMode, networkName } from './config/env';

import { GlobalSearchInput } from './components/global-search-input';
import { TutorialOverlay, useTutorial } from './components/tutorial-overlay';
import { useLocalStorage } from './lib/use-local-storage';
import { useDebounce } from './lib/use-debounce';
import { useKeyboardShortcuts } from './lib/use-keyboard-shortcuts';
import { parseClaimsFromHash } from './lib/claim-export';
import { ClaimWorkspaceProvider } from './lib/claim-workspace';
import { useClaimWorkspace } from './lib/use-claim-workspace';
import { ThemeSchema } from './lib/schemas';
import { GLOBAL_SEARCH_DEBOUNCE_MS, TUTORIAL_ROUTE_SETTLE_MS } from './lib/timings';
import { HomePage } from './pages/home';
import { EntityMatrixPage } from './pages/entity-matrix';
import { GlossaryPage } from './pages/glossary';
import type { Theme } from './types';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function isTheme(value: unknown): value is Theme {
  return ThemeSchema.safeParse(value).success;
}

export default function App() {
  const [theme, setTheme] = useLocalStorage<Theme>('ontology-theme', getSystemTheme(), {
    validate: isTheme,
  });
  const tutorial = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(globalSearchQuery, GLOBAL_SEARCH_DEBOUNCE_MS);
  const globalSearchRef = useRef<HTMLInputElement>(null);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  const openTutorial = useCallback(() => {
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for navigation to settle before opening
      setTimeout(() => tutorial.open(), TUTORIAL_ROUTE_SETTLE_MS);
    } else {
      tutorial.open();
    }
  }, [location.pathname, navigate, tutorial]);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '/',
      description: 'Focus global search',
      handler: () => {
        globalSearchRef.current?.focus();
      },
    },
    {
      key: '?',
      shiftKey: true,
      description: 'Open tutorial',
      handler: () => openTutorial(),
    },
  ]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `focus-ring h-8 inline-flex items-center rounded-md px-3 text-sm font-medium transition-colors ${
      isActive
        ? 'text-[var(--color-text)] bg-[var(--color-surface-raised)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
    }`;

  return (
    <ClaimWorkspaceProvider searchQuery={debouncedSearchQuery}>
      <div className="min-h-screen bg-[var(--color-bg)] pb-10">
        <TutorialOverlay isOpen={tutorial.isOpen} onClose={tutorial.close} />

        <header className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              {/* Logo */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </div>

              {/* Navigation */}
              <nav className="flex items-center gap-1" aria-label="Main navigation">
                <NavLink to="/" end className={navLinkClass}>
                  Explorer
                </NavLink>
                <NavLink to="/matrix" className={navLinkClass} data-tutorial-step="entity-matrix-link">
                  Matrix
                </NavLink>
                <NavLink to="/glossary" className={navLinkClass}>
                  Glossary
                </NavLink>
              </nav>
            </div>

            {/* Global search */}
            <div className="hidden sm:flex flex-1 max-w-sm">
              <GlobalSearchInput
                value={globalSearchQuery}
                onChange={setGlobalSearchQuery}
                inputRef={globalSearchRef}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Network indicator */}
              {isDemoMode ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Demo Mode
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {networkName}
                </span>
              )}

              {/* Wallet Connect */}
              <ConnectButton
                chainStatus="icon"
                accountStatus="avatar"
                showBalance={false}
              />

              <button
                onClick={openTutorial}
                className="focus-ring h-8 w-8 inline-flex items-center justify-center rounded-md text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                aria-label="Open tutorial"
                title="Tutorial"
              >
                <HelpIcon />
              </button>
              <button
                onClick={toggleTheme}
                className="focus-ring h-8 w-8 inline-flex items-center justify-center rounded-md text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
        </header>

        <SharedBatchFromHash />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/matrix" element={<EntityMatrixPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
        </Routes>
      </div>
    </ClaimWorkspaceProvider>
  );
}

/**
 * Reads `#claims=...` from the URL and imports the batch.
 *
 * Listens for `hashchange` so pasting a shared link while the app is already
 * open works (the original mount-only effect required a full reload).
 */
function SharedBatchFromHash() {
  const { setBatch } = useClaimWorkspace();

  useEffect(() => {
    const importFromCurrentHash = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const claims = parseClaimsFromHash(hash);
      if (claims && claims.length > 0) {
        setBatch(claims);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    importFromCurrentHash();
    window.addEventListener('hashchange', importFromCurrentHash);
    return () => window.removeEventListener('hashchange', importFromCurrentHash);
  }, [setBatch]);

  return null;
}

// ─── Theme Icons ──────────────────────────────────────────

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
