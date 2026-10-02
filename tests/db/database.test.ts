/**
 * Veritabanı kuralları: tüm migration'lar bellek içi bir Postgres'e (PGlite)
 * uygulanır ve Supabase'in kimlik yapısı taklit edilir. Kullanıcıların
 * birbirinin verisini göremediğini ve deneme hakkı kuralını doğrular.
 */
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const MIGRATIONS = path.resolve(__dirname, "../../supabase/migrations");

let db: PGlite;
let alice: string;
let bob: string;

async function rows<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}

async function asUser(id: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`);
}

async function asAdmin() {
  await db.exec("reset role");
}

/** Sorgu hata verirse false döner (RLS veya kısıt engelledi). */
async function allowed(sql: string, params: unknown[] = []) {
  return db.query(sql, params).then(
    () => true,
    () => false,
  );
}

beforeAll(async () => {
  db = new PGlite();
  // Supabase ortamının asgari taklidi: roller, auth şeması ve auth.uid().
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  for (const file of fs.readdirSync(MIGRATIONS).sort()) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS, file), "utf8"));
  }
  await db.exec(`
    grant usage on schema public to authenticated, anon;
    -- Supabase varsayılanı gibi: tablo izinleri açık, veriyi yalnızca RLS korur.
    grant select, insert, update, delete on all tables in schema public to authenticated, anon;
  `);

  [{ id: alice }] = await rows<{ id: string }>(`insert into auth.users(email) values ('alice@test.com') returning id`);
  [{ id: bob }] = await rows<{ id: string }>(`insert into auth.users(email) values ('bob@test.com') returning id`);
});

afterAll(async () => {
  await db?.close();
});

beforeEach(asAdmin);

describe("kayıt", () => {
  it("yeni kullanıcıya deneme hesabı ve tercihler açılır", async () => {
    const [user] = await rows<{ subscription_status: string; trial_limit_used: number }>(
      "select subscription_status, trial_limit_used from users where id = $1",
      [alice],
    );
    expect(user).toEqual({ subscription_status: "trial", trial_limit_used: 0 });
    expect(await rows("select 1 from user_preferences where user_id = $1", [alice])).toHaveLength(1);
  });
});

describe("deneme hakkı (consume_generation_credit)", () => {
  it("3 hak düşer, sonra hesap dolar ve üretim reddedilir", async () => {
    const [{ id }] = await rows<{ id: string }>(`insert into auth.users(email) values ('trial@test.com') returning id`);
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const [{ ok }] = await rows<{ ok: boolean }>("select public.consume_generation_credit($1, 3) as ok", [id]);
      results.push(ok);
    }
    expect(results).toEqual([true, true, true, false]);
    const [user] = await rows<{ subscription_status: string }>("select subscription_status from users where id = $1", [id]);
    expect(user.subscription_status).toBe("expired");
  });

  it("abonede hak sayacı artmaz", async () => {
    const [{ id }] = await rows<{ id: string }>(`insert into auth.users(email) values ('pro@test.com') returning id`);
    await db.query("update users set subscription_status = 'active' where id = $1", [id]);
    for (let i = 0; i < 5; i++) await db.query("select public.consume_generation_credit($1, 3)", [id]);
    const [user] = await rows<{ trial_limit_used: number }>("select trial_limit_used from users where id = $1", [id]);
    expect(user.trial_limit_used).toBe(0);
  });

  it("kullanıcı hak fonksiyonunu kendisi çağıramaz", async () => {
    await asUser(alice);
    expect(await allowed("select public.consume_generation_credit($1, 3)", [alice])).toBe(false);
  });

  it("kullanıcı kendi abonelik durumunu değiştiremez", async () => {
    await asUser(alice);
    await db.query("update users set subscription_status = 'active' where id = $1", [alice]).catch(() => {});
    await asAdmin();
    const [user] = await rows<{ subscription_status: string }>("select subscription_status from users where id = $1", [alice]);
    expect(user.subscription_status).toBe("trial");
  });
});

describe("veri izolasyonu (RLS)", () => {
  let aliceOutput: string;
  let aliceProfile: string;

  beforeAll(async () => {
    await asAdmin();
    [{ id: aliceOutput }] = await rows<{ id: string }>(
      `insert into generated_outputs(user_id, title, document) values ($1, 'Alice planı', '{}') returning id`,
      [alice],
    );
    [{ id: aliceProfile }] = await rows<{ id: string }>(
      `insert into context_profiles(user_id, name, kind) values ($1, 'Alice işi', 'work') returning id`,
      [alice],
    );
    await db.query(`insert into profile_memories(profile_id, user_id, content) values ($1, $2, 'gizli bilgi')`, [aliceProfile, alice]);
    await db.query(`insert into generation_jobs(user_id, kind, title) values ($1, 'generate', 'Alice işi')`, [alice]);
    await db.query(`insert into feedback(user_id, kind, message) values ($1, 'other', 'Alice mesajı')`, [alice]);
  });

  it("sahibi kendi kayıtlarını görür", async () => {
    await asUser(alice);
    expect(await rows("select id from generated_outputs")).toHaveLength(1);
    expect(await rows("select id from context_profiles")).toHaveLength(1);
    expect(await rows("select id from profile_memories")).toHaveLength(1);
    expect(await rows("select id from generation_jobs")).toHaveLength(1);
    expect(await rows("select id from feedback")).toHaveLength(1);
  });

  it.each(["generated_outputs", "context_profiles", "profile_memories", "generation_jobs", "feedback", "user_preferences"])(
    "başka kullanıcı %s tablosunda Alice'in kaydını göremez",
    async (table) => {
      await asUser(bob);
      const visible = await rows<{ user_id: string }>(`select user_id from ${table}`);
      expect(visible.every((r) => r.user_id === bob)).toBe(true);
    },
  );

  it("başka kullanıcı Alice'in planını değiştiremez veya silemez", async () => {
    await asUser(bob);
    const updated = await db.query("update generated_outputs set title = 'ele geçirildi' where id = $1", [aliceOutput]);
    const deleted = await db.query("delete from generated_outputs where id = $1", [aliceOutput]);
    expect(updated.affectedRows).toBe(0);
    expect(deleted.affectedRows).toBe(0);
  });

  it("başka kullanıcı Alice'in profiline hafıza ekleyemez", async () => {
    await asUser(bob);
    expect(
      await allowed(`insert into profile_memories(profile_id, user_id, content) values ($1, $2, 'sızma')`, [aliceProfile, bob]),
    ).toBe(false);
  });

  it("kullanıcı plan veya iş kaydını doğrudan oluşturamaz (yalnızca sunucu)", async () => {
    await asUser(alice);
    expect(await allowed(`insert into generated_outputs(user_id, title, document) values ($1, 'x', '{}')`, [alice])).toBe(false);
    expect(await allowed(`insert into generation_jobs(user_id, kind, title) values ($1, 'generate', 'x')`, [alice])).toBe(false);
  });

  it("kullanıcı iş durumunu değiştiremez", async () => {
    await asUser(alice);
    const result = await db.query("update generation_jobs set status = 'succeeded'");
    expect(result.affectedRows).toBe(0);
  });

  it("kullanıcı başkası adına geri bildirim gönderemez", async () => {
    await asUser(bob);
    expect(await allowed(`insert into feedback(user_id, kind, message) values ($1, 'bug', 'sahte kayıt')`, [alice])).toBe(false);
    expect(await allowed(`insert into feedback(user_id, kind, message) values ($1, 'bug', 'gerçek kayıt')`, [bob])).toBe(true);
  });
});

describe("projeler", () => {
  let aliceProject: string;
  let bobProject: string;
  let aliceOutput: string;

  beforeAll(async () => {
    await asAdmin();
    [{ id: aliceProject }] = await rows<{ id: string }>(
      `insert into projects(user_id, name) values ($1, 'Alice projesi') returning id`,
      [alice],
    );
    [{ id: bobProject }] = await rows<{ id: string }>(`insert into projects(user_id, name) values ($1, 'Bob projesi') returning id`, [bob]);
    [{ id: aliceOutput }] = await rows<{ id: string }>(
      `insert into generated_outputs(user_id, title, document) values ($1, 'Alice proje planı', '{}') returning id`,
      [alice],
    );
  });

  it("kullanıcı yalnızca kendi projelerini görür ve kendi adına proje açabilir", async () => {
    await asUser(alice);
    expect(await rows("select id from projects")).toEqual([{ id: aliceProject }]);
    expect(await allowed(`insert into projects(user_id, name) values ($1, 'Yeni')`, [alice])).toBe(true);
    expect(await allowed(`insert into projects(user_id, name) values ($1, 'Sahte')`, [bob])).toBe(false);
    await asAdmin();
  });

  it("plan yalnızca kendi projesine taşınabilir", async () => {
    await asUser(alice);
    expect(await allowed("update generated_outputs set project_id = $1 where id = $2", [aliceProject, aliceOutput])).toBe(true);
    expect(await allowed("update generated_outputs set project_id = $1 where id = $2", [bobProject, aliceOutput])).toBe(false);
    await asAdmin();
    expect(await rows("select project_id from generated_outputs where id = $1", [aliceOutput])).toEqual([{ project_id: aliceProject }]);
  });

  it("başka kullanıcı projeyi değiştiremez veya silemez", async () => {
    await asUser(bob);
    await db.query("update projects set name = 'hack' where id = $1", [aliceProject]);
    await db.query("delete from projects where id = $1", [aliceProject]);
    await asAdmin();
    expect(await rows("select name from projects where id = $1", [aliceProject])).toEqual([{ name: "Alice projesi" }]);
  });

  it("proje yalnızca kullanıcının kendi profiline bağlanabilir", async () => {
    await asAdmin();
    const [{ id: aliceProfile }] = await rows<{ id: string }>(
      `insert into context_profiles(user_id, name, kind) values ($1, 'Alice şirketi', 'work') returning id`,
      [alice],
    );
    const [{ id: bobProfile }] = await rows<{ id: string }>(
      `insert into context_profiles(user_id, name, kind) values ($1, 'Bob şirketi', 'work') returning id`,
      [bob],
    );

    await asUser(alice);
    expect(await allowed("update projects set profile_id = $1 where id = $2", [aliceProfile, aliceProject])).toBe(true);
    expect(await allowed("update projects set profile_id = $1 where id = $2", [bobProfile, aliceProject])).toBe(false);
    expect(
      await allowed(`insert into projects(user_id, name, profile_id) values ($1, 'Sızma', $2)`, [alice, bobProfile]),
    ).toBe(false);

    // Profil silinince proje silinmez, profilsiz kalır.
    await db.query("delete from context_profiles where id = $1", [aliceProfile]);
    await asAdmin();
    expect(await rows("select profile_id from projects where id = $1", [aliceProject])).toEqual([{ profile_id: null }]);
  });

  it("proje silinince planlar silinmez, projesiz kalır", async () => {
    await asUser(alice);
    await db.query("delete from projects where id = $1", [aliceProject]);
    await asAdmin();
    expect(await rows("select project_id from generated_outputs where id = $1", [aliceOutput])).toEqual([{ project_id: null }]);
  });
});

describe("paylaşım bağlantısı", () => {
  const TOKEN = "AbCdEfGhIjKlMnOpQrStUv12";
  let output: string;

  beforeAll(async () => {
    await asAdmin();
    [{ id: output }] = await rows<{ id: string }>(
      `insert into generated_outputs(user_id, title, document) values ($1, 'Paylaşılan', '{}') returning id`,
      [alice],
    );
  });

  it("sahibi paylaşımı açıp kapatabilir, başkası açamaz", async () => {
    await asUser(bob);
    const hijack = await db.query("update generated_outputs set share_token = $1 where id = $2", [TOKEN, output]);
    expect(hijack.affectedRows).toBe(0);

    await asUser(alice);
    const own = await db.query("update generated_outputs set share_token = $1, shared_at = now() where id = $2", [TOKEN, output]);
    expect(own.affectedRows).toBe(1);
  });

  it("paylaşılan plan giriş yapmamış ziyaretçiye veya başka kullanıcıya veritabanından açılmaz", async () => {
    await asUser(bob);
    expect(await rows("select id from generated_outputs where share_token = $1", [TOKEN])).toHaveLength(0);
    await db.exec("set role anon");
    expect(await rows("select id from generated_outputs where share_token = $1", [TOKEN])).toHaveLength(0);
    expect(await rows("select id from generated_outputs")).toHaveLength(0);
  });

  it("görüntülenme sayacı yalnızca sunucu tarafından artırılır", async () => {
    await asUser(bob);
    expect(await allowed("select public.record_share_view($1)", [TOKEN])).toBe(false);
    await asAdmin();
    await db.query("select public.record_share_view($1)", [TOKEN]);
    await db.query("select public.record_share_view($1)", [TOKEN]);
    const [row] = await rows<{ share_views: number }>("select share_views from generated_outputs where id = $1", [output]);
    expect(row.share_views).toBe(2);
  });

  it("paylaşım ve görüntülenme planı 'düzenlendi' göstermez; içerik değişikliği gösterir", async () => {
    const before = await rows<{ updated_at: string }>("select updated_at::text from generated_outputs where id = $1", [output]);
    await db.query("select public.record_share_view($1)", [TOKEN]);
    await db.query("update generated_outputs set share_token = null where id = $1", [output]);
    const after = await rows<{ updated_at: string }>("select updated_at::text from generated_outputs where id = $1", [output]);
    expect(after[0].updated_at).toBe(before[0].updated_at);

    await db.query("update generated_outputs set title = 'Yeni ad' where id = $1", [output]);
    const edited = await rows<{ updated_at: string }>("select updated_at::text from generated_outputs where id = $1", [output]);
    expect(edited[0].updated_at).not.toBe(before[0].updated_at);
  });

  it("aynı bağlantı anahtarı iki planda kullanılamaz", async () => {
    await db.query("update generated_outputs set share_token = $1 where id = $2", [TOKEN, output]);
    expect(
      await allowed(`insert into generated_outputs(user_id, title, document, share_token) values ($1, 'x', '{}', $2)`, [bob, TOKEN]),
    ).toBe(false);
  });
});

describe("abonelik kredileri (consume_credits)", () => {
  async function newUser(email: string, patch = "") {
    const [{ id }] = await rows<{ id: string }>(`insert into auth.users(email) values ($1) returning id`, [email]);
    if (patch) await db.query(`update users set ${patch} where id = $1`, [id]);
    return id;
  }
  const consume = async (id: string, cost: number, monthly = 10) =>
    (await rows<{ ok: boolean }>("select public.consume_credits($1, $2, 1, $3) as ok", [id, cost, monthly]))[0].ok;
  const state = async (id: string) =>
    (await rows<{ subscription_status: string; trial_limit_used: number; credits_used: number }>(
      "select subscription_status, trial_limit_used, credits_used from users where id = $1",
      [id],
    ))[0];

  it("deneme hesabı tek plan hakkını kullanınca kapanır (detaylı plan da 1 hak)", async () => {
    const id = await newUser("deneme1@test.com");
    expect(await consume(id, 2)).toBe(true);
    expect(await state(id)).toMatchObject({ subscription_status: "expired", trial_limit_used: 1 });
    expect(await consume(id, 1)).toBe(false);
  });

  it("abone kredisi maliyete göre düşer ve limitte durur", async () => {
    const id = await newUser("baslangic@test.com", "subscription_status = 'active', plan = 'starter'");
    for (let i = 0; i < 4; i++) expect(await consume(id, 2)).toBe(true);
    expect((await state(id)).credits_used).toBe(8);
    expect(await consume(id, 3)).toBe(false);
    expect((await state(id)).credits_used).toBe(8);
    expect(await consume(id, 2)).toBe(true);
    expect(await consume(id, 1)).toBe(false);
  });

  it("ay dolunca kredi sayacı sıfırlanır ve pencere ay ay ilerler", async () => {
    const id = await newUser(
      "yenilenen@test.com",
      "subscription_status = 'active', plan = 'pro', credits_used = 30, credits_period_start = now() - interval '40 days'",
    );
    expect(await consume(id, 1, 30)).toBe(true);
    const [row] = await rows<{ credits_used: number; fresh: boolean }>(
      "select credits_used, credits_period_start > now() - interval '1 month' as fresh from users where id = $1",
      [id],
    );
    expect(row).toEqual({ credits_used: 1, fresh: true });
  });

  it("yönetici (internal) hesap kotasızdır, aktif olmayan hesap harcayamaz", async () => {
    const admin = await newUser("sahip@test.com", "subscription_status = 'active', plan = 'internal'");
    for (let i = 0; i < 20; i++) expect(await consume(admin, 2)).toBe(true);
    const expired = await newUser("bitmis@test.com", "subscription_status = 'expired', plan = 'pro'");
    expect(await consume(expired, 1)).toBe(false);
  });

  it("kullanıcı fonksiyonu çağıramaz, planını veya kredisini değiştiremez", async () => {
    await asUser(alice);
    expect(await allowed("select public.consume_credits($1, 1, 1, 10)", [alice])).toBe(false);
    await db.query("update users set plan = 'internal', credits_used = 0 where id = $1", [alice]).catch(() => {});
    await asAdmin();
    const [row] = await rows<{ plan: string }>("select plan from users where id = $1", [alice]);
    expect(row.plan).toBe("free");
  });

  it("geçersiz plan adı kabul edilmez", async () => {
    expect(await allowed("update users set plan = 'altin' where id = $1", [bob])).toBe(false);
  });
});

describe("tek seferlik kredi paketi", () => {
  async function newUser(email: string, patch = "") {
    const [{ id }] = await rows<{ id: string }>(`insert into auth.users(email) values ($1) returning id`, [email]);
    if (patch) await db.query(`update users set ${patch} where id = $1`, [id]);
    return id;
  }
  const consume = async (id: string, cost: number, monthly = 8) =>
    (await rows<{ ok: boolean }>("select public.consume_credits($1, $2, 1, $3) as ok", [id, cost, monthly]))[0].ok;
  const addPack = async (id: string, purchase: string, credits = 3) =>
    (await rows<{ ok: boolean }>("select public.add_pack_credits($1, $2, $3, 14900, 'try') as ok", [id, purchase, credits]))[0].ok;
  const state = async (id: string) =>
    (await rows<{ subscription_status: string; credits_used: number; pack_credits: number }>(
      "select subscription_status, credits_used, pack_credits from users where id = $1",
      [id],
    ))[0];

  it("aynı ödeme iki kez gelse de kredi bir kez eklenir", async () => {
    const id = await newUser("paket1@test.com");
    expect(await addPack(id, "cs_test_1")).toBe(true);
    expect(await addPack(id, "cs_test_1")).toBe(false);
    expect((await state(id)).pack_credits).toBe(3);
  });

  it("deneme hakkı bitmiş kullanıcı paket kredisini harcar", async () => {
    const id = await newUser("paket2@test.com", "subscription_status = 'expired', trial_limit_used = 1");
    expect(await consume(id, 1)).toBe(false);
    await addPack(id, "cs_test_2");
    expect(await consume(id, 2)).toBe(true);
    expect(await consume(id, 2)).toBe(false);
    expect(await consume(id, 1)).toBe(true);
    expect(await state(id)).toMatchObject({ subscription_status: "expired", pack_credits: 0 });
  });

  it("denemede önce ücretsiz hak kullanılır, paket korunur", async () => {
    const id = await newUser("paket3@test.com");
    await addPack(id, "cs_test_3");
    expect(await consume(id, 2)).toBe(true);
    expect(await state(id)).toMatchObject({ subscription_status: "expired", pack_credits: 3 });
    expect(await consume(id, 1)).toBe(true);
    expect((await state(id)).pack_credits).toBe(2);
  });

  it("abonede önce aylık kredi, yetmezse paket kredisi kullanılır", async () => {
    const id = await newUser("paket4@test.com", "subscription_status = 'active', plan = 'starter', credits_used = 7");
    await addPack(id, "cs_test_4");
    expect(await consume(id, 2)).toBe(true);
    expect(await state(id)).toMatchObject({ credits_used: 8, pack_credits: 2 });
    expect(await consume(id, 3)).toBe(false);
    expect(await state(id)).toMatchObject({ credits_used: 8, pack_credits: 2 });
  });

  it("kullanıcı paket kredisi ekleyemez ve kendi kredisini değiştiremez", async () => {
    await asUser(alice);
    expect(await allowed("select public.add_pack_credits($1, 'sahte', 100, 0, 'try')", [alice])).toBe(false);
    await db.query("update users set pack_credits = 100 where id = $1", [alice]).catch(() => {});
    expect(await allowed("select * from credit_purchases")).toBe(true);
    const visible = await rows<{ id: string }>("select id from credit_purchases");
    await asAdmin();
    expect(visible).toEqual([]);
    expect((await state(alice)).pack_credits).toBe(0);
  });
});

describe("kayıtsız önizleme kotası", () => {
  const consume = async (visitor: string, perVisitor = 3, global = 5) => {
    const [{ ok }] = await rows<{ ok: boolean }>("select public.consume_preview_quota($1, $2, $3) as ok", [visitor, perVisitor, global]);
    return ok;
  };

  it("ziyaretçi başına günlük sınırda durur", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consume("ziyaretci-a", 3, 100));
    expect(results).toEqual([true, true, true, false]);
  });

  it("site geneli sınır dolunca yeni ziyaretçiye de izin vermez", async () => {
    await db.exec("delete from preview_quota");
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await consume(`kisi-${i}`, 3, 2));
    expect(results).toEqual([true, true, false]);
  });

  it("reddedilen istek sayacı artırmaz", async () => {
    await db.exec("delete from preview_quota");
    await consume("b", 1, 100);
    await consume("b", 1, 100);
    const [global] = await rows<{ used: number }>("select used from preview_quota where bucket like 'global:%'");
    expect(global.used).toBe(1);
  });

  it("eski günlerin kayıtlarını temizler", async () => {
    await db.query("insert into preview_quota(bucket, day, used) values ('visitor:eski', current_date - 5, 3)");
    await consume("c");
    expect(await rows("select 1 from preview_quota where bucket = 'visitor:eski'")).toHaveLength(0);
  });

  it("ziyaretçi veya kullanıcı kota tablosunu göremez, fonksiyonu çağıramaz", async () => {
    await db.exec("set role anon");
    expect(await rows("select * from preview_quota")).toHaveLength(0);
    expect(await allowed("select public.consume_preview_quota('x', 99, 99)")).toBe(false);
    await asUser(alice);
    expect(await allowed("select public.consume_preview_quota('x', 99, 99)")).toBe(false);
  });
});

describe("kısıtlar", () => {
  it("geçersiz iş durumu ve türü reddedilir", async () => {
    expect(await allowed(`insert into generation_jobs(user_id, kind, title) values ($1, 'hack', 'x')`, [alice])).toBe(false);
    expect(
      await allowed(`insert into generation_jobs(user_id, kind, title, status) values ($1, 'generate', 'x', 'done')`, [alice]),
    ).toBe(false);
  });

  it("hesap silinince kullanıcının tüm verisi silinir", async () => {
    const [{ id }] = await rows<{ id: string }>(`insert into auth.users(email) values ('silinecek@test.com') returning id`);
    const [{ id: out }] = await rows<{ id: string }>(
      `insert into generated_outputs(user_id, title, document) values ($1, 'p', '{}') returning id`,
      [id],
    );
    await db.query(`insert into generation_jobs(user_id, kind, title, output_id) values ($1, 'refine', 'p', $2)`, [id, out]);
    await db.query(`insert into feedback(user_id, kind, message) values ($1, 'other', 'hoşça kal')`, [id]);

    await db.query("delete from auth.users where id = $1", [id]);
    for (const table of ["users", "generated_outputs", "generation_jobs", "feedback", "user_preferences"]) {
      const column = table === "users" ? "id" : "user_id";
      expect(await rows(`select 1 from ${table} where ${column} = $1`, [id]), table).toHaveLength(0);
    }
  });
});
