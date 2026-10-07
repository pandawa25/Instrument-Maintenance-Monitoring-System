import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login-page';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  // @ts-expect-error — kembalikan ke keadaan jsdom (tanpa matchMedia)
  delete window.matchMedia;
});

describe('LoginPage — posisi badge Mini Tools', () => {
  it.each([
    ['desktop', true],
    ['layar sempit', false],
  ])('%s: tepat satu badge, berada di grup yang sama dengan logo (di bawahnya)', (_name, desktop) => {
    mockMatchMedia(desktop);
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const badges = screen.getAllByRole('button', { name: /mini tools/i });
    expect(badges).toHaveLength(1);

    const group = badges[0].parentElement as HTMLElement;
    expect(within(group).getAllByAltText('IMMS').length).toBeGreaterThan(0);

    // Logo mendahului badge di DOM → badge ada di bawah logo, bukan menimpanya.
    const logo = within(group).getAllByAltText('IMMS')[0];
    expect(logo.compareDocumentPosition(badges[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('form login tetap ada', () => {
    mockMatchMedia(true);
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
});
