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
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
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
