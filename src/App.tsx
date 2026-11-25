import { LogOut, ShieldAlert } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ArionLogo } from '@/components/ArionLogo';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AdminInstancePage } from '@/features/admin/AdminInstancePage';
import { AdminInstrumentsPage } from '@/features/admin/AdminInstrumentsPage';
import { AdminPanelPage } from '@/features/admin/AdminPanelPage';
import { AdminUsersPage } from '@/features/admin/AdminUsersPage';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { useAuth } from '@/features/auth/useAuth';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { HomePage } from '@/features/home/HomePage';
import { LivePage } from '@/features/live/LivePage';
import { DeveloperInfoPage } from '@/features/more/DeveloperInfoPage';
import { GuidePage } from '@/features/more/GuidePage';
import { MoreMenuPage } from '@/features/more/MoreMenuPage';
import { PrivacyPage } from '@/features/more/PrivacyPage';
import { SettingsPage } from '@/features/more/SettingsPage';
import { SupportPage } from '@/features/more/SupportPage';
import { SongReaderPage } from '@/features/reader/SongReaderPage';
import { RepertoirePage } from '@/features/repertoire/RepertoirePage';
import { SongEditorPage } from '@/features/repertoire/SongEditorPage';
import { SetlistsPage } from '@/features/setlists/SetlistsPage';
import { it } from '@/i18n/it';

function AppGate() {
  const { status, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--arion-bg)] px-4 text-[var(--arion-text)]">
        <ArionLogo size="lg" showWordmark showSubtitle />
        <p className="text-sm font-semibold text-[var(--arion-text-muted)]">{it.common.loading}</p>
      </div>
    );
  }

  if (status === 'unconfigured') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--arion-bg)] px-4 text-[var(--arion-text)]">
        <div className="w-full max-w-md space-y-4 rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-accent)] bg-[var(--arion-surface)] p-6 shadow-xs">
          <ArionLogo size="md" showWordmark showSubtitle />
          <h1 className="font-editorial text-xl font-bold">{it.auth.unconfiguredTitle}</h1>
          <p className="text-sm leading-relaxed text-[var(--arion-text-muted)]">
            {it.auth.unconfiguredBody}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginPage />;
  }

  if (status === 'inactive') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--arion-bg)] px-4 text-[var(--arion-text)]">
        <div className="w-full max-w-md space-y-4 rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-danger)] bg-[var(--arion-surface)] p-6 shadow-xs">
          <div className="flex items-center gap-2 text-[var(--arion-danger)]">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h1 className="font-editorial text-xl font-bold text-[var(--arion-text)]">
              {it.auth.inactiveTitle}
            </h1>
          </div>
          <p className="text-sm leading-relaxed text-[var(--arion-text-muted)]">
            {it.auth.inactiveBody}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{it.auth.signOutButton}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/repertorio" element={<RepertoirePage />} />
        <Route path="/repertorio/nuovo" element={<SongEditorPage />} />
        <Route path="/repertorio/:songId/modifica" element={<SongEditorPage />} />
        <Route path="/repertorio/:songId" element={<SongReaderPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/scalette" element={<SetlistsPage />} />
        <Route path="/altro" element={<MoreMenuPage />} />
        <Route path="/impostazioni" element={<SettingsPage />} />
        <Route path="/guida" element={<GuidePage />} />
        <Route path="/assistenza" element={<SupportPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/info-sviluppatori" element={<DeveloperInfoPage />} />
        <Route path="/admin" element={<AdminPanelPage />} />
        <Route path="/admin/istanza" element={<AdminInstancePage />} />
        <Route path="/admin/utenti" element={<AdminUsersPage />} />
        <Route path="/admin/strumenti" element={<AdminInstrumentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

interface AppProps {
  authOverride?: AuthContextValue;
}

export function App({ authOverride }: AppProps) {
  return (
    <ThemeProvider>
      <AuthProvider valueOverride={authOverride}>
        <AppGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
