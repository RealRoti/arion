import type { NotationSystem, TextSizeMode, ThemeMode } from '@/domain/models/theme';
import type { Role } from '@/domain/rbac/permissions';

export interface UserProfile {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: Role;
  readonly isActive: boolean;
  readonly activeInstrumentId: string | null;
  readonly preferredNotation: NotationSystem;
  readonly preferredTheme: ThemeMode;
  readonly preferredTextSize: TextSizeMode;
  readonly fontScale: number;
}

export interface InstanceSettings {
  readonly id: number;
  readonly groupName: string;
  readonly groupSubtitle: string | null;
  readonly supportEmail: string | null;
  readonly logoPath: string | null;
  readonly logoSignedUrl: string | null;
  readonly defaultNotation: NotationSystem;
  readonly defaultTheme: ThemeMode;
  readonly updatedAt: string;
}

export interface AllowedEmailEntry {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly displayName: string | null;
  readonly defaultInstrumentIds: readonly string[];
  readonly isActive: boolean;
  readonly createdAt: string;
}
