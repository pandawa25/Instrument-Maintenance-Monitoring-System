import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { AppQueryProvider } from './providers/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export function App() {
  return (
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
  );
}
