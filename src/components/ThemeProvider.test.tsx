import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useTheme } from '@/components/useTheme';

function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="active-theme">{theme}</span>
      <button type="button" onClick={() => setTheme('oled_black')}>
        OLED
      </button>
      <button type="button" onClick={() => setTheme('daylight')}>
        Daylight
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  it('defaults to stage_dark and updates document theme and localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('active-theme')).toHaveTextContent('stage_dark');
    expect(document.documentElement.dataset.theme).toBe('stage_dark');

    fireEvent.click(screen.getByRole('button', { name: 'OLED' }));
    expect(screen.getByTestId('active-theme')).toHaveTextContent('oled_black');
    expect(document.documentElement.dataset.theme).toBe('oled_black');
    expect(window.localStorage.getItem('arion:theme')).toBe('oled_black');

    fireEvent.click(screen.getByRole('button', { name: 'Daylight' }));
    expect(screen.getByTestId('active-theme')).toHaveTextContent('daylight');
    expect(document.documentElement.dataset.theme).toBe('daylight');
    expect(window.localStorage.getItem('arion:theme')).toBe('daylight');
  });
});
