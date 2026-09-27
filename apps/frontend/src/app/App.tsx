import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppQueryProvider } from './providers/query-provider';

export function App() {
  return (
    <AppQueryProvider>
      <RouterProvider router={router} />
    </AppQueryProvider>
  );
}
