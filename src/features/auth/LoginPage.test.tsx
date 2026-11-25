import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { LoginPage } from '@/features/auth/LoginPage';
import { it } from '@/i18n/it';
import * as authService from '@/services/authService';

vi.mock('@/services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/authService')>();
  return {
    ...actual,
    requestEmailOtp: vi.fn(),
    verifyEmailOtp: vi.fn(),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  vitestIt('submits email, transitions to 6-digit OTP step and verifies code', async () => {
    vi.mocked(authService.requestEmailOtp).mockResolvedValueOnce();
    vi.mocked(authService.verifyEmailOtp).mockResolvedValueOnce({} as never);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(it.auth.emailLabel);
    fireEvent.change(emailInput, { target: { value: 'admin@arion.local' } });
    fireEvent.click(screen.getByRole('button', { name: it.auth.sendCodeButton }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: it.auth.otpStepTitle })).toBeInTheDocument();
    });

    expect(authService.requestEmailOtp).toHaveBeenCalledWith('admin@arion.local');

    const otpInput = screen.getByLabelText(it.auth.otpLabel);
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: it.auth.verifyOtpButton }));

    await waitFor(() => {
      expect(authService.verifyEmailOtp).toHaveBeenCalledWith('admin@arion.local', '123456');
    });
  });

  vitestIt('displays Italian unauthorized error when email is not in whitelist', async () => {
    vi.mocked(authService.requestEmailOtp).mockRejectedValueOnce(
      new authService.AuthServiceError('NOT_AUTHORIZED', 'Blocked'),
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(it.auth.emailLabel), {
      target: { value: 'intruder@arion.local' },
    });
    fireEvent.click(screen.getByRole('button', { name: it.auth.sendCodeButton }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(it.auth.errors.notAuthorized);
    });
  });

  vitestIt('allows returning to email step from OTP step', async () => {
    vi.mocked(authService.requestEmailOtp).mockResolvedValueOnce();

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(it.auth.emailLabel), {
      target: { value: 'musicista@arion.local' },
    });
    fireEvent.click(screen.getByRole('button', { name: it.auth.sendCodeButton }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: it.auth.otpStepTitle })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: it.auth.changeEmailButton }));
    expect(screen.getByRole('heading', { name: it.auth.loginTitle })).toBeInTheDocument();
  });
});
