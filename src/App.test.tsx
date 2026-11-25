import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it as vitestIt } from 'vitest';
import { App } from '@/App';
import { it } from '@/i18n/it';

describe('App Milestone 1.0 Shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  vitestIt('renders Italian brand, subtitle and allows switching themes', () => {
    render(<App />);

    expect(screen.getByText(it.app.name)).toBeInTheDocument();
    expect(screen.getByText(it.app.subtitle)).toBeInTheDocument();

    const oledBtn = screen.getByRole('button', { name: it.themes.oledBlack });
    fireEvent.click(oledBtn);

    expect(oledBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('oled_black');
  });

  vitestIt('toggles chords visibility and adjusts lectern font scale', () => {
    render(<App />);

    expect(screen.getByText('Sol/Si')).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: it.readerPreview.modeChords });
    fireEvent.click(toggleBtn);

    expect(screen.queryByText('Sol/Si')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: it.readerPreview.modeLyricsOnly }),
    ).toBeInTheDocument();

    const previewBody = screen.getByTestId('lectern-preview-body');
    expect(previewBody.style.fontSize).toBe('1rem');
    expect(screen.getByLabelText(it.readerPreview.fontScaleLabel)).toHaveTextContent('100%');

    fireEvent.click(screen.getByRole('button', { name: it.readerPreview.fontIncreaseLabel }));
    expect(previewBody.style.fontSize).toBe('1.1rem');
    expect(screen.getByLabelText(it.readerPreview.fontScaleLabel)).toHaveTextContent('110%');

    fireEvent.click(screen.getByRole('button', { name: it.readerPreview.fontDecreaseLabel }));
    expect(previewBody.style.fontSize).toBe('1rem');
    expect(screen.getByLabelText(it.readerPreview.fontScaleLabel)).toHaveTextContent('100%');
  });
});
