import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { notifyHighlightToggled } from './highlight-toast';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('notifyHighlightToggled', () => {
  it('isHighlighted=true -> pesan "ditandai"', () => {
    notifyHighlightToggled(true);
    expect(toast.success).toHaveBeenCalledWith('Ditandai sebagai Highlight Pekerjaan');
  });

  it('isHighlighted=false -> pesan "dibatalkan"', () => {
    notifyHighlightToggled(false);
    expect(toast.success).toHaveBeenCalledWith('Highlight dibatalkan');
  });
});
