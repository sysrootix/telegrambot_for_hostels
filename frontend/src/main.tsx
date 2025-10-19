import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';

import App from './App';
import './index.css';
import { SessionProvider } from '@/providers/SessionProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <HashRouter>
          <App />
          <Toaster
            position="top-center"
            containerStyle={{ paddingTop: 16 }}
            toastOptions={{
              style: {
                background: 'var(--tg-theme-secondary-bg-color, #17212b)',
                color: 'var(--tg-theme-text-color, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--tg-theme-section-separator-color, rgba(255,255,255,0.08))'
              }
            }}
          />
        </HashRouter>
      </SessionProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
