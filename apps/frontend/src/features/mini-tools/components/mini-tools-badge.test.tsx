import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MiniToolsBadge } from './mini-tools-badge';

// Elemen `hidden` (display:none) tidak punya accessible name di jsdom, jadi dicari lewat aria-label
// supaya panel bisa ditemukan dalam keadaan tertutup juga.
function panel() {
  return screen.getByLabelText('Mini Tools', { selector: '[role="dialog"]' });
}

// Semua tab tetap ter-mount (disembunyikan) supaya isian tidak hilang, jadi query di dalam panel
// bisa menemukan elemen kembar dari tab lain. getByRole mengabaikan elemen hidden → tepat satu
// tabpanel yang sedang aktif.
function active() {
  return within(screen.getByRole('tabpanel'));
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
    const p = active();

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
    const p = active();

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
    const p = active();

    expect(p.getAllByText('12').length).toBeGreaterThan(0);
    expect(p.getByText('50')).toBeVisible();
  });

  it('pressure di luar range memunculkan peringatan; URV = LRV memunculkan pesan error', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    await user.click(screen.getByRole('tab', { name: /pressure ↔ signal/i }));
    const p = active();

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
    const p = active();

    expect(p.getByLabelText('LRV (4 mA)')).toBeVisible();
    expect(p.getByLabelText('URV (20 mA)')).toBeVisible();

    await user.selectOptions(p.getByLabelText('Jenis sinyal'), '0–10 V');
    expect(p.getByLabelText('LRV (0 V)')).toBeVisible();
    expect(p.getByLabelText('URV (10 V)')).toBeVisible();
  });

  it('flow gas: satuan per jam & per hari tersedia, MMSCFD → Sm³/day dengan koreksi kondisi standar', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    const p = active();

    await user.click(p.getByRole('button', { name: 'Flow' }));
    const from = p.getByLabelText('Dari');
    const gasGroup = within(from).getByRole('group', { name: 'Gas standar' });
    for (const label of ['Nm³/h', 'Nm³/day', 'Sm³/h', 'Sm³/day', 'SCFH', 'SCFD']) {
      expect(within(gasGroup).getByRole('option', { name: label })).toBeInTheDocument();
    }

    await user.selectOptions(from, 'mmscfd');
    await user.selectOptions(p.getByLabelText('Ke'), 'Sm3d');
    expect(p.getByText('28.262,46')).toBeVisible();
    expect(p.getByText(/Kondisi standar: Nm³ = 0 °C/)).toBeVisible();
  });

  it('flow gas → volume aktual tidak didukung dan memberi penjelasan', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    const p = active();

    await user.click(p.getByRole('button', { name: 'Flow' }));
    await user.selectOptions(p.getByLabelText('Dari'), 'mmscfd');
    await user.selectOptions(p.getByLabelText('Ke'), 'm3h');

    expect(p.getByRole('status')).toHaveTextContent(/hanya bisa dikonversi ke satuan gas standar lain/i);
    expect(p.getByText('—')).toBeVisible();
  });

  it('tab Pressure ↔ Flow: 62,5 mbar pada range 0–250 mbar = 50 % flow (akar kuadrat)', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    await user.click(screen.getByRole('tab', { name: /pressure ↔ flow/i }));
    const p = active();

    // default: DP 62,5 mbar, range 0–250, flow maks 100 m³/h → 25 % DP → 50 % flow → 50 m³/h
    expect(p.getAllByText('50').length).toBeGreaterThanOrEqual(2); // flow & % flow
    expect(p.getByText('25')).toBeVisible(); // % span DP
    expect(p.getByText('8 mA')).toBeVisible(); // output transmitter linear
    expect(p.getByText('12 mA')).toBeVisible(); // output dengan sqrt extraction
  });

  it('tab Pressure ↔ Flow: arah dibalik, flow 50 → DP 62,5 mbar', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    await user.click(screen.getByRole('tab', { name: /pressure ↔ flow/i }));
    const p = active();

    await user.click(p.getByRole('button', { name: 'Flow → Pressure' }));
    expect(p.getByText('62,5')).toBeVisible();
    expect(p.getByText('mbar', { selector: 'span' })).toBeInTheDocument();
  });

  it('tab Pressure ↔ Flow: DP di bawah LRV dan URV = LRV memberi pesan, bukan hasil', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));
    await user.click(screen.getByRole('tab', { name: /pressure ↔ flow/i }));
    const p = active();

    const dp = p.getByLabelText('DP terukur');
    await user.clear(dp);
    await user.type(dp, '-5');
    expect(p.getByRole('alert')).toHaveTextContent(/di bawah LRV/i);

    await user.clear(dp);
    await user.type(dp, '300');
    expect(p.getByRole('status')).toHaveTextContent(/di atas 100 %/i);

    const urv = p.getByLabelText(/URV/);
    await user.clear(urv);
    await user.type(urv, '0');
    expect(p.getByRole('alert')).toHaveTextContent('URV harus berbeda dari LRV.');
  });

  it('isian tetap ada setelah pindah tab dan kembali', async () => {
    const user = userEvent.setup();
    render(<MiniToolsBadge />);
    await user.click(screen.getByRole('button', { name: /mini tools/i }));

    const value = within(panel()).getByLabelText('Nilai');
    await user.clear(value);
    await user.type(value, '42');
    await user.click(screen.getByRole('tab', { name: /pressure ↔ signal/i }));
    await user.click(screen.getByRole('tab', { name: /^unit$/i }));

    expect(within(panel()).getByLabelText('Nilai')).toHaveValue('42');
  });
});
