import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';

import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import App from './App';
import { wagmiConfig } from './intuition/wagmi-config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={{
            darkMode: darkTheme({
              accentColor: '#a3e635',
              accentColorForeground: 'black',
              borderRadius: 'medium',
            }),
            lightMode: lightTheme({
              accentColor: '#65a30d',
              accentColorForeground: 'white',
              borderRadius: 'medium',
            }),
          }}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
