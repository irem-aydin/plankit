import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetailLevel } from "@/core/ai/intake";

export interface UserPreferences {
  displayName: string | null;
  personalizationEnabled: boolean;
  autoRemember: boolean;
  defaultDetail: DetailLevel;
  defaultProfileId: string | null;
}

type PreferencesRow = {
  display_name: string | null;
  personalization_enabled: boolean;
  auto_remember: boolean;
  default_detail: DetailLevel;
  default_profile_id: string | null;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: null,
  personalizationEnabled: true,
  autoRemember: true,
  defaultDetail: "summary",
  defaultProfileId: null,
};

/** Kullanıcı tercihleri (RLS: yalnızca kendi satırı). */
export class PreferencesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(userId: string): Promise<UserPreferences> {
    const { data, error } = await this.client
      .from("user_preferences")
      .select("display_name, personalization_enabled, auto_remember, default_detail, default_profile_id")
      .eq("user_id", userId)
      .maybeSingle<PreferencesRow>();
    if (error) {
      // Tercihler kritik değil: okunamazsa varsayılanlarla devam et.
      console.error(`Tercihler okunamadı: ${error.message}`);
      return DEFAULT_PREFERENCES;
    }
    if (!data) return DEFAULT_PREFERENCES;
    return {
      displayName: data.display_name,
      personalizationEnabled: data.personalization_enabled,
      autoRemember: data.auto_remember,
      defaultDetail: data.default_detail,
      defaultProfileId: data.default_profile_id,
    };
  }

  async update(userId: string, patch: Partial<UserPreferences>) {
    const row: Partial<PreferencesRow> = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.personalizationEnabled !== undefined) row.personalization_enabled = patch.personalizationEnabled;
    if (patch.autoRemember !== undefined) row.auto_remember = patch.autoRemember;
    if (patch.defaultDetail !== undefined) row.default_detail = patch.defaultDetail;
    if (patch.defaultProfileId !== undefined) row.default_profile_id = patch.defaultProfileId;

    const { error } = await this.client.from("user_preferences").update(row).eq("user_id", userId);
    if (error) throw new Error(`Tercihler kaydedilemedi: ${error.message}`);
  }
}
