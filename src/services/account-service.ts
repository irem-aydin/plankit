import "server-only";
import { getStripe } from "@/infrastructure/stripe";
import { AccountRepository } from "@/infrastructure/supabase/account-repository";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { PreferencesRepository } from "@/infrastructure/supabase/preferences-repository";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

/**
 * KVKK kapsamında kullanıcının kendi verilerini dışa aktarması.
 * Kullanıcı istemcisiyle (RLS) okunur; yalnızca kendi kayıtları gelir.
 */
export async function exportUserData(userId: string) {
  const supabase = await createSupabaseServerClient();
  const profilesRepo = new ProfileRepository(supabase);
  const outputsRepo = new OutputRepository(supabase);

  const [account, preferences, profiles, outputList] = await Promise.all([
    new AccountRepository(supabase).findById(userId),
    new PreferencesRepository(supabase).get(userId),
    profilesRepo.list(),
    outputsRepo.listForCurrentUser(1_000),
  ]);

  const profilesWithMemory = await Promise.all(
    profiles.map(async (p) => ({ ...p, memories: await profilesRepo.listMemories(p.id) })),
  );
  const outputs = await Promise.all(outputList.map((o) => outputsRepo.findById(o.id)));

  return {
    exportedAt: new Date().toISOString(),
    account: account && {
      email: account.email,
      subscriptionStatus: account.subscriptionStatus,
      trialStartedAt: account.trialStartedAt,
      trialLimitUsed: account.trialLimitUsed,
      currentPeriodEnd: account.currentPeriodEnd,
    },
    preferences,
    profiles: profilesWithMemory,
    outputs: outputs.filter(Boolean),
  };
}

/**
 * Hesabı ve tüm verileri kalıcı olarak siler. Aktif Stripe aboneliği varsa
 * önce iptal edilir. Çağıran, kullanıcının kimliğini ve onayını doğrulamalıdır.
 */
export async function deleteUserAccount(userId: string) {
  const admin = createSupabaseAdminClient();
  const account = await new AccountRepository(admin).findById(userId);

  if (account?.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      await getStripe().subscriptions.cancel(account.stripeSubscriptionId);
    } catch (error) {
      console.error("Hesap silinirken Stripe aboneliği iptal edilemedi:", error);
    }
  }

  // auth.users silinince public.users ve bağlı tüm tablolar (cascade) silinir.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Hesap silinemedi: ${error.message}`);
}
