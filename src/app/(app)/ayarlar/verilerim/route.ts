import { getAuthenticatedUser } from "@/infrastructure/supabase/server";
import { exportUserData } from "@/services/account-service";

/** Kullanıcının tüm verilerini JSON dosyası olarak indirir. */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return new Response("Yetkisiz", { status: 401 });

  const data = await exportUserData(user.id);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="plankit-verilerim-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
