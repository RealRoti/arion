import { afterAll, describe, expect, it } from 'vitest';
import { createAdminServiceClient, createAnonClient } from './helpers';

const MAILPIT_BASE_URL = 'http://127.0.0.1:54324';

interface MailpitMessageSummary {
  ID: string;
  Subject: string;
  To: Array<{ Address: string }>;
}

interface MailpitMessagesResponse {
  messages: MailpitMessageSummary[];
}

interface MailpitMessageDetail {
  ID: string;
  Subject: string;
  HTML: string;
  Text: string;
}

async function waitForMailpitMessage(recipientEmail: string): Promise<MailpitMessageDetail> {
  const normalizedTarget = recipientEmail.toLowerCase();

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const res = await fetch(`${MAILPIT_BASE_URL}/api/v1/messages`);
    if (res.ok) {
      const data = (await res.json()) as MailpitMessagesResponse;
      const match = data.messages.find((msg) =>
        msg.To.some((recipient) => recipient.Address.toLowerCase() === normalizedTarget),
      );
      if (match) {
        const detailRes = await fetch(`${MAILPIT_BASE_URL}/api/v1/message/${match.ID}`);
        if (detailRes.ok) {
          return (await detailRes.json()) as MailpitMessageDetail;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for Mailpit email to ${recipientEmail}`);
}

describe('Invite-Only Email + 6-Digit OTP Flow (Mailpit Integration)', () => {
  const tempEmail = `otp-test-${Date.now()}@arion.local`;
  let createdUserId: string | null = null;

  afterAll(async () => {
    const serviceClient = createAdminServiceClient();
    if (createdUserId) {
      await serviceClient.auth.admin.deleteUser(createdUserId);
    }
    await serviceClient.from('allowed_emails').delete().eq('email', tempEmail);
  });

  it('rejects OTP request for non-whitelisted email', async () => {
    const anonClient = createAnonClient();
    const { error } = await anonClient.auth.signInWithOtp({
      email: 'not-invited-otp@arion.local',
      options: { shouldCreateUser: true },
    });

    expect(error).not.toBeNull();
  });

  it('sends Italian Magic Link + 6-digit OTP email and verifies OTP into an authenticated session', async () => {
    const serviceClient = createAdminServiceClient();
    const anonClient = createAnonClient();

    const { error: inviteErr } = await serviceClient.from('allowed_emails').insert({
      email: tempEmail,
      role: 'musician',
      display_name: 'Utente OTP Test',
      is_active: true,
    });
    expect(inviteErr).toBeNull();

    const { error: otpReqErr } = await anonClient.auth.signInWithOtp({
      email: tempEmail,
      options: { shouldCreateUser: true },
    });
    expect(otpReqErr).toBeNull();

    const emailMessage = await waitForMailpitMessage(tempEmail);
    expect(emailMessage.Subject).toContain('Arion');

    const bodyText = `${emailMessage.Text}\n${emailMessage.HTML}`;
    const otpMatch = bodyText.match(/(?:^|\D)(\d{6})(?:\D|$)/);
    expect(otpMatch?.[1]).toBeTruthy();

    const token = otpMatch![1]!;
    const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
      email: tempEmail,
      token,
      type: 'email',
    });

    expect(verifyErr).toBeNull();
    expect(verifyData.session?.access_token).toBeTruthy();
    expect(verifyData.user?.email).toBe(tempEmail);
    createdUserId = verifyData.user?.id ?? null;
  });
});
