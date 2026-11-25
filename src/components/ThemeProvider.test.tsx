import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useTheme } from '@/components/useTheme';

function PreferencesProbe() {
  const { theme, setTheme, textSize, setTextSize, notation, setNotation } = useTheme();
  return (
    <div>
      <span data-testid="active-theme">{theme}</span>
      <span data-testid="active-text-size">{textSize}</span>
      <span data-testid="active-notation">{notation}</span>
      <button type="button" onClick={() => setTheme('stage_dark')}>
        Stage
      </button>
      <button type="button" onClick={() => setTheme('oled_black')}>
        OLED
      </button>
      <button type="button" onClick={() => setTextSize('extended')}>
        Extended
      </button>
      <button type="button" onClick={() => setNotation('english')}>
        English
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.dataset.textSize = '';
  });

  it('defaults to daylight, compact textSize and italian notation, persisting updates', () => {
    render(
      <ThemeProvider>
        <PreferencesProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('active-theme')).toHaveTextContent('daylight');
    expect(screen.getByTestId('active-text-size')).toHaveTextContent('compact');
    expect(screen.getByTestId('active-notation')).toHaveTextContent('italian');
    expect(document.documentElement.dataset.theme).toBe('daylight');
    expect(document.documentElement.dataset.textSize).toBe('compact');

    fireEvent.click(screen.getByRole('button', { name: 'Stage' }));
    expect(screen.getByTestId('active-theme')).toHaveTextContent('stage_dark');
    expect(document.documentElement.dataset.theme).toBe('stage_dark');
    expect(window.localStorage.getItem('arion:theme')).toBe('stage_dark');

    fireEvent.click(screen.getByRole('button', { name: 'OLED' }));
    expect(screen.getByTestId('active-theme')).toHaveTextContent('oled_black');
    expect(window.localStorage.getItem('arion:theme')).toBe('oled_black');

    fireEvent.click(screen.getByRole('button', { name: 'Extended' }));
    expect(screen.getByTestId('active-text-size')).toHaveTextContent('extended');
    expect(document.documentElement.dataset.textSize).toBe('extended');
    expect(window.localStorage.getItem('arion:text-size')).toBe('extended');

    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByTestId('active-notation')).toHaveTextContent('english');
    expect(window.localStorage.getItem('arion:notation')).toBe('english');
  });
});
