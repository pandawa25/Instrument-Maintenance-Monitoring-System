import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  // Fallback custom per-pemakaian (mis. untuk boundary lokal di sekitar satu
  // chart) — kalau tidak diisi, dipakai fallback full-page default di bawah.
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error Boundary global — sebelum ini TIDAK ADA sama sekali di aplikasi, jadi
 * satu error saat render (mis. akses properti dari response API yang bentuknya
 * tidak terduga) akan membuat SELURUH app jadi blank putih tanpa pesan apapun
 * ke user, dan user harus reload manual tanpa tahu apa yang terjadi.
 *
 * React Error Boundary WAJIB berupa class component — belum ada API hook
 * resminya (per React 18/19) untuk menangkap error di render tree anak.
 *
 * Dipasang di App.tsx membungkus seluruh RouterProvider (menangkap error di
 * halaman manapun), dan opsional dipasang ulang mengelilingi bagian spesifik
 * (mis. 1 chart dashboard) via prop `fallback` kalau suatu saat perlu isolasi
 * supaya 1 chart error tidak menjatuhkan seluruh dashboard.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
            <AlertTriangle className="h-7 w-7 text-danger" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-text">Terjadi kesalahan tak terduga</h1>
            <p className="max-w-md text-sm text-text-muted">
              Aplikasi mengalami error dan tidak bisa melanjutkan halaman ini. Muat ulang halaman untuk mencoba lagi
              — kalau masalah berlanjut, hubungi administrator sistem.
            </p>
          </div>
          <Button onClick={this.handleReload}>Muat Ulang Halaman</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
