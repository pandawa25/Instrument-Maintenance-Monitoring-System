import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MiniToolsBadge } from './mini-tools-badge';

// Elemen `hidden` (display:none) tidak punya accessible name di jsdom, jadi dicari lewat aria-label
// supaya panel bisa ditemukan dalam keadaan tertutup juga.
function panel() {
  return screen.getByLabelText('Mini Tools', { selector: '[role="dialog"]' });
}

describe('MiniToolsBadge', () => {
  it('awalnya tertutup; badge membuka dan menutup panel', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    const badge = screen.getByRole('button', { name: /mini tools/i });

    expect(badge).toHaveAttribute('aria-expanded', 'false');
    expect(panel()).not.toBeVisible();

    await user.click(badge);
    expect(badge).toHaveAttribute('aria-expanded', 'true');
    expect(panel()).toBeVisible();

    await user.click(badge);
    expect(panel()).not.toBeVisible();
  });

  it('Escape menutup panel dan mengembalikan fokus ke badge', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    const badge = screen.getByRole('button', { name: /mini tools/i });

    await user.click(badge);
    await user.keyboard('{Escape}');

    expect(panel()).not.toBeVisible();
    expect(badge).toHaveFocus();
  });

  it('klik di luar panel menutupnya, klik di dalam tidak', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <MiniToolsBadge />
        <button type="button">di-luar</button>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: /mini tools/i }));

    await user.click(within(panel()).getByLabelText('Nilai'));
    expect(panel()).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'di-luar' }));
    expect(panel()).not.toBeVisible();
  });

  it('konversi unit default: 1 bar → psi', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));

    expect(within(panel()).getByText('14,50377')).toBeVisible();
  });

  it('ganti besaran ke Signal dan terima koma desimal: 12 mA → 3 V', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    const p = within(panel());

    await user.click(p.getByRole('button', { name: 'Signal' }));
    const value = p.getByLabelText('Nilai');
    await user.clear(value);
    await user.type(value, '12');
    expect(p.getByText('3')).toBeVisible();

    await user.clear(value);
    await user.type(value, '8,8'); // (8,8-4)/16 = 30 % → 2,2 V
    expect(p.getByText('2,2')).toBeVisible();
  });

  it('flow lintas jenis meminta densitas: t/h → m³/h', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    const p = within(panel());

    await user.click(p.getByRole('button', { name: 'Flow' }));
    await user.selectOptions(p.getByLabelText('Dari'), 't/h');
    await user.selectOptions(p.getByLabelText('Ke'), 'm³/h');

    const density = p.getByLabelText('Densitas fluida (kondisi operasi)');
    await user.clear(density);
    await user.type(density, '800');
    expect(p.getByText('1,25')).toBeVisible(); // 1 t/h ÷ 800 kg/m³
  });

  it('tab Pressure ↔ Signal: 5 bar pada range 0–10 bar = 12 mA (50 %)', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    await user.click(screen.getByRole('tab', { name: /pressure ↔ signal/i }));
    const p = within(panel());

    expect(p.getAllByText('12').length).toBeGreaterThan(0);
    expect(p.getByText('50')).toBeVisible();
  });

  it('pressure di luar range memunculkan peringatan; URV = LRV memunculkan pesan error', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    await user.click(screen.getByRole('tab', { name: /pressure ↔ signal/i }));
    const p = within(panel());

    const pv = p.getByLabelText('Tekanan terukur');
    await user.clear(pv);
    await user.type(pv, '12');
    expect(p.getByRole('status')).toHaveTextContent(/di luar range/i);

    const urv = p.getByLabelText(/URV/);
    await user.clear(urv);
    await user.type(urv, '0');
    expect(p.getByText('URV harus berbeda dari LRV.')).toBeVisible();
  });

  it('label LRV/URV mengikuti jenis sinyal yang dipilih', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    await user.click(screen.getByRole('tab', { name: /pressure ↔ signal/i }));
    const p = within(panel());

    expect(p.getByLabelText('LRV (4 mA)')).toBeVisible();
    expect(p.getByLabelText('URV (20 mA)')).toBeVisible();

    await user.selectOptions(p.getByLabelText('Jenis sinyal'), '0–10 V');
    expect(p.getByLabelText('LRV (0 V)')).toBeVisible();
    expect(p.getByLabelText('URV (10 V)')).toBeVisible();
  });

  it('isian tetap ada setelah pindah tab dan kembali', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));

    const value = within(panel()).getByLabelText('Nilai');
    await user.clear(value);
    await user.type(value, '42');
    await user.click(screen.getByRole('tab', { name: /pressure ↔ signal/i }));
    await user.click(screen.getByRole('tab', { name: /konversi unit/i }));

    expect(within(panel()).getByLabelText('Nilai')).toHaveValue('42');
  });
});
