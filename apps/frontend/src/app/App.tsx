import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { AppQueryProvider } from './providers/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { bootstrapAuth } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';

export function App() {
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Access token tidak di-persist (lihat auth.store.ts) — coba re-hydrate
  // sesi dari refresh token cookie sekali di awal, sebelum route guard
  // (RequireAuth) sempat memutuskan user "belum login" dan redirect paksa
  // ke /login padahal sebenarnya sesinya masih valid.
  useEffect(() => {
    bootstrapAuth();
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingState message="Memuat sesi..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppQueryProvider>
        <TooltipProvider delayDuration={200}>
          <RouterProvider router={router} />
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: 'font-sans',
              },
            }}
          />
        </TooltipProvider>
      </AppQueryProvider>
    </ErrorBoundary>
  );
}
