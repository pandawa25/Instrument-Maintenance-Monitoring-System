import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Activity, Eye, EyeOff, Loader2, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { loginRequest } from '../api/auth.api';
import { useAuthStore } from '@/store/auth.store';

const HIGHLIGHTS = [
  { icon: Wrench, text: 'Pantau corrective & preventive maintenance dalam satu sistem' },
  { icon: Activity, text: 'KPI reliability (MTTR/MTBF) dan Instrument Health Index real-time' },
  { icon: ShieldCheck, text: 'Jejak audit lengkap untuk setiap perubahan data' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { accessToken, user } = await loginRequest({ email, password });
      setSession(accessToken, user);
      navigate('/dashboard');
    } catch {
      toast.error('Email atau password salah');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Panel kiri — brand & highlight, disembunyikan di layar sempit supaya form tetap fokus */}
      <div className="relative hidden w-[46%] overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dim lg:flex lg:flex-col lg:justify-between lg:p-10">
        <BrandPattern />

        <div className="relative flex items-center gap-2.5 text-white">
          <img src="/brand/app-mark.png" alt="IMMS" className="h-9 w-9 rounded-lg shadow-sm" />
          <span className="text-sm font-semibold tracking-wide">IMMS</span>
        </div>

        <div className="relative">
          <h2 className="mb-3 text-2xl font-semibold leading-snug text-white">
            Instrument Maintenance
            <br />
            Monitoring System
          </h2>
          <p className="mb-8 max-w-sm text-sm text-white/80">
            Platform terpusat untuk monitoring, maintenance, dan reliability instrumentasi fasilitas migas &amp; energi.
          </p>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <span className="pt-0.5">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/60">© {new Date().getFullYear()} IMMS — Internal Use Only</div>
      </div>

      {/* Panel kanan — form login */}
      <div className="flex w-full flex-1 flex-col justify-between px-6 py-8 sm:px-10 lg:w-[54%] lg:px-16">
        <div className="flex items-center justify-between lg:justify-end">
          <img src="/brand/logo-icon-wordmark-h56.png" alt="IMMS — Instrument Maintenance & Monitoring System" className="h-8 w-auto lg:hidden" />
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-xl font-semibold text-text">Masuk ke akun Anda</h1>
          <p className="mt-1 text-sm text-text-muted">Masukkan kredensial untuk mengakses dashboard maintenance.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-text-muted hover:text-text"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted lg:text-left">
          Hubungi Administrator jika Anda mengalami kendala akses.
        </p>
      </div>
    </div>
  );
}

// Pola dekoratif abstrak (garis + titik, terinspirasi P&ID/instrument loop) —
// murni SVG buatan sendiri, bukan aset pihak ketiga.
function BrandPattern() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
      viewBox="0 0 400 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="80" r="28" stroke="white" strokeWidth="1.5" />
      <circle cx="60" cy="80" r="4" fill="white" />
      <path d="M88 80H200" stroke="white" strokeWidth="1.5" />
      <circle cx="230" cy="80" r="18" stroke="white" strokeWidth="1.5" />
      <path d="M248 80H340" stroke="white" strokeWidth="1.5" />
      <path d="M340 80V180" stroke="white" strokeWidth="1.5" />
      <rect x="320" y="180" width="40" height="28" rx="4" stroke="white" strokeWidth="1.5" />

      <path d="M60 108V260" stroke="white" strokeWidth="1.5" />
      <rect x="40" y="260" width="40" height="28" rx="4" stroke="white" strokeWidth="1.5" />
      <path d="M60 288V400" stroke="white" strokeWidth="1.5" />
      <circle cx="60" cy="430" r="22" stroke="white" strokeWidth="1.5" />
      <circle cx="60" cy="430" r="4" fill="white" />

      <path d="M150 400H340" stroke="white" strokeWidth="1.5" />
      <circle cx="150" cy="400" r="16" stroke="white" strokeWidth="1.5" />
      <circle cx="260" cy="400" r="16" stroke="white" strokeWidth="1.5" />
      <path d="M340 400V500" stroke="white" strokeWidth="1.5" />
      <rect x="318" y="500" width="44" height="30" rx="4" stroke="white" strokeWidth="1.5" />

      <path d="M150 416V520" stroke="white" strokeWidth="1.5" />
      <circle cx="150" cy="540" r="20" stroke="white" strokeWidth="1.5" />
      <circle cx="150" cy="540" r="4" fill="white" />
    </svg>
  );
}
