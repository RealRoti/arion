import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AdminPanelPage } from '@/features/admin/AdminPanelPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { HomePage } from '@/features/home/HomePage';
import { LivePage } from '@/features/live/LivePage';
import { DeveloperInfoPage } from '@/features/more/DeveloperInfoPage';
import { GuidePage } from '@/features/more/GuidePage';
import { MoreMenuPage } from '@/features/more/MoreMenuPage';
import { PrivacyPage } from '@/features/more/PrivacyPage';
import { SettingsPage } from '@/features/more/SettingsPage';
import { SupportPage } from '@/features/more/SupportPage';
import { RepertoirePage } from '@/features/repertoire/RepertoirePage';
import { SongReaderPage } from '@/features/repertoire/SongReaderPage';
import { SetlistsPage } from '@/features/setlists/SetlistsPage';

export function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/repertorio" element={<RepertoirePage />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </ThemeProvider>
  );
}

export default App;
