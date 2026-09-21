"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  FREE_TEXT_HINTS,
  INTAKE_QUESTIONS,
  LANGUAGES,
  LANGUAGE_LABELS,
  type DetailLevel,
  type IntakeMode,
  type Language,
} from "@/core/ai/intake";
import type { SubcategoryOption } from "@/infrastructure/supabase/catalog-queries";
import { generateAction } from "../actions";
import { FileInput, FilePicker, useFileSelection } from "./file-picker";

const MODES: { id: IntakeMode; title: string; text: string }[] = [
  { id: "quick", title: "Kısa sorular", text: "5 soru · ~2 dakika" },
  { id: "detailed", title: "Detaylı sorular", text: "13 soru · daha isabetli sonuç" },
  { id: "free", title: "Kendim anlatayım", text: "Serbest metin" },
];

/** Listede baştan gösterilen başlık sayısı; gerisi "Tümünü gör" altında. */
const FEATURED_COUNT = 6;

const DETAIL_OPTIONS: { id: DetailLevel; title: string; text: string }[] = [
  { id: "summary", title: "Özet plan", text: "Kısa, hemen uygulanabilir · daha hızlı" },
  { id: "detailed", title: "Detaylı plan", text: "Kapsamlı çalışma dokümanı · daha uzun sürer" },
];

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none";

export interface ProfileOption {
  id: string;
  name: string;
  kindLabel: string;
  completeness: number;
}

export function SelectionForm({
  categoryId,
  categoryName,
  subcategories,
  canGenerate,
  remainingTrial,
  aiAvailable,
  personalizationEnabled,
  profiles,
  defaultProfileId,
  defaultDetail,
}: {
  categoryId: string;
  categoryName: string;
  subcategories: SubcategoryOption[];
  canGenerate: boolean;
  remainingTrial: number | null;
  aiAvailable: boolean;
  personalizationEnabled: boolean;
  profiles: ProfileOption[];
  defaultProfileId: string | null;
  defaultDetail: DetailLevel;
}) {
  const [state, formAction] = useActionState(generateAction, {});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"select" | "context">("select");
  const [mode, setMode] = useState<IntakeMode>("quick");
  const [detail, setDetail] = useState<DetailLevel>(defaultDetail);
  const [language, setLanguage] = useState<Language>("tr");
  const [profileId, setProfileId] = useState<string>(defaultProfileId ?? profiles[0]?.id ?? "");
  const [saveAsProfile, setSaveAsProfile] = useState(false);
  const [customRequest, setCustomRequest] = useState("");
  const [showAll, setShowAll] = useState(false);
  const fileSelection = useFileSelection();
  const selectedProfile = profiles.find((p) => p.id === profileId);

  const selectedSubs = subcategories.filter((s) => selected.has(s.id));
  const hasCustom = customRequest.trim().length > 0;
  // Seçim yorgunluğunu azaltmak için önce öne çıkan başlıklar: hazır şablonu olanlar, sonra katalog sırası.
  const featuredIds = new Set(
    [...subcategories.filter((s) => s.hasContent), ...subcategories.filter((s) => !s.hasContent)]
      .slice(0, FEATURED_COUNT)
      .map((s) => s.id),
  );
  const hiddenCount = subcategories.length - featuredIds.size;
  const visibleSubs = showAll ? subcategories : subcategories.filter((s) => featuredIds.has(s.id) || selected.has(s.id));
  const hasSelection = selectedSubs.length > 0 || hasCustom;
  // Profil seçiliyse veya kullanıcı ne istediğini zaten yazdıysa soruları tekrar sormayız.
  const contextFromUser = Boolean(selectedProfile) || hasCustom;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = subcategories.length > 0 && subcategories.every((s) => selected.has(s.id));
  const trialNote =
    remainingTrial !== null && canGenerate
      ? `Bu üretim deneme hakkından 1 düşecek (kalan: ${remainingTrial}).`
      : canGenerate
        ? "Aboneliğin aktif — sınırsız üretim."
        : "";

  return (
    <form action={formAction} className="mt-8">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="subcategoryIds" value={id} />
      ))}
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="customRequest" value={customRequest} />
      <input type="hidden" name="jobTitle" value={selectedSubs.map((s) => s.name).join(", ")} />
      <FileInput inputRef={fileSelection.inputRef} />

      {/* ---------------------------------------------------- Adım: seçim */}
      <div hidden={step !== "select"}>
        {/* Serbest istek: sayfanın en üstünde, asıl giriş noktası */}
        <div className="rounded-2xl border border-pink-300 bg-gradient-to-br from-pink-50 to-white p-4 sm:p-5">
          <label htmlFor="custom-request" className="block text-base font-semibold text-slate-900">
            ✨ Ne oluşturmak istiyorsun?
          </label>
          <p className="mt-1 text-sm text-slate-600">
            {categoryName} alanında ihtiyacını kendi cümlenle yaz; yapay zekâ konuya uygun çerçeveyi hazırlayıp senin
            durumuna göre doldursun. Ya da aşağıdaki hazır başlıklardan seç.
          </p>
          <textarea
            id="custom-request"
            value={customRequest}
            onChange={(e) => setCustomRequest(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Örn. Bayilerimizi değerlendirmek için bir performans ve sözleşme yenileme çerçevesi istiyorum."
            className={`${inputClass} field-sizing-content min-h-16 bg-white`}
          />
          {hasCustom && (
            <p className="mt-2 text-xs font-medium text-pink-800">
              İsteğin dokümana eklenecek. İstersen aşağıdan başlık da seçebilirsin.
            </p>
          )}

          <FilePicker selection={fileSelection} id="files-top" compact />
        </div>

        <div className="mt-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            veya hazır başlıklardan seç
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-slate-600">
            <strong className="text-slate-900">{selected.size}</strong> başlık seçildi
          </span>
          {subcategories.length > 1 && (
            <button
              type="button"
              onClick={() => setSelected(allSelected ? new Set() : new Set(subcategories.map((s) => s.id)))}
              className="font-medium text-rose-600 hover:underline"
            >
              {allSelected ? "Seçimi temizle" : "Hepsini seç"}
            </button>
          )}
        </div>

        <fieldset className="grid gap-3 md:grid-cols-2">
          <legend className="sr-only">Alt başlıklar</legend>
          {visibleSubs.map((sub) => {
            const checked = selected.has(sub.id);
            return (
              <label
                key={sub.id}
                className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition ${
                  checked ? "border-rose-400 ring-2 ring-rose-500/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(sub.id)}
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-rose-600"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{sub.name}</span>
                    {/* Şablon tipindekileri yapay zekâ doldurur; hazır içeriği olmayanları sıfırdan tasarlar. */}
                    {(sub.outputType === "template" || !sub.hasContent) && (
                      <span
                        title="Yapay zekâ bu başlığı senin durumuna göre hazırlar"
                        className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700 ring-1 ring-pink-200 ring-inset"
                      >
                        ✨ Yapay zekâ
                      </span>
                    )}
                    {sub.hasContent && (
                      <span
                        title="Uzmanlarca hazırlanmış şablon; yapay zekâ senin durumuna göre doldurur"
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset"
                      >
                        ⭐ Hazır şablon
                      </span>
                    )}
                  </span>
                  {sub.description && <span className="mt-1 block text-sm text-slate-600">{sub.description}</span>}
                </span>
              </label>
            );
          })}
        </fieldset>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 w-full rounded-xl border border-dashed border-slate-300 bg-white py-3 text-sm font-medium text-rose-600 hover:border-rose-300"
          >
            {showAll ? "Daha az göster" : `Tüm başlıkları gör (${hiddenCount} başlık daha)`}
          </button>
        )}
        </div>

        <StickyBar error={step === "select" ? state.error : undefined} note={trialNote}>
          <button
            type="button"
            disabled={!canGenerate || !hasSelection || !aiAvailable}
            onClick={() => {
              setStep("context");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Devam et →
          </button>
        </StickyBar>
      </div>

      {/* ------------------------------------------------ Adım: bağlam */}
      {step === "context" && (
        <div>
          <button
            type="button"
            onClick={() => setStep("select")}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Başlık seçimine dön
          </button>

          <p className="mt-4 text-sm font-medium text-pink-700">Adım 3</p>
          <div className="mt-1 rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-white p-5 sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">
              {contextFromUser ? "Son ayarlar" : "Durumunu anlat, planını birlikte hazırlayalım"}
            </h2>
            {hasCustom && !selectedProfile && (
              <p className="mt-1 text-sm text-slate-600">
                İsteğini aldık: <span className="font-medium text-slate-900">&ldquo;{customRequest.trim()}&rdquo;</span>{" "}
                Tekrar soru sormuyoruz; istersen aşağıya ek bilgi ekleyebilirsin.
              </p>
            )}
            <p className="mt-1 text-sm text-slate-600" hidden={hasCustom && !selectedProfile}>
              Yapay zekâ anlattıklarına göre{" "}
              <strong>
                {[...selectedSubs.map((s) => s.name), ...(hasCustom ? ["kendi isteğin"] : [])].join(", ")}
              </strong>{" "}
              için analiz, öneri ve somut aksiyon adımları hazırlayacak. Ne kadar net anlatırsan sonuç o kadar isabetli
              olur. Emin olmadığın soruları boş bırakabilirsin.
            </p>

            {personalizationEnabled && (
              <div className="mt-5">
                <p className="text-sm font-medium text-slate-800">Bu plan kimin için?</p>
                <div role="radiogroup" aria-label="Profil" className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={profileId === p.id}
                      onClick={() => setProfileId(p.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        profileId === p.id
                          ? "border-pink-500 bg-white ring-2 ring-pink-500/20"
                          : "border-slate-200 bg-white/60 hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-xs text-slate-500">{p.kindLabel}</span>
                      <span className="block text-sm font-semibold text-slate-900">{p.name}</span>
                      <span className="block text-xs text-slate-500">🧠 Seni hatırlıyor · profil %{Math.round(p.completeness * 100)} dolu</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={profileId === ""}
                    onClick={() => setProfileId("")}
                    className={`rounded-xl border p-3 text-left transition ${
                      profileId === ""
                        ? "border-pink-500 bg-white ring-2 ring-pink-500/20"
                        : "border-slate-200 bg-white/60 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-xs text-slate-500">✏️ Tek seferlik</span>
                    <span className="block text-sm font-semibold text-slate-900">Profil kullanmadan anlat</span>
                    <span className="block text-xs text-slate-500">Soruları bu plan için cevapla</span>
                  </button>
                </div>
                {profiles.length === 0 && (
                  <p className="mt-2 text-xs text-slate-600">
                    İpucu: Aşağıdaki cevapları profil olarak kaydedersen bir dahaki sefere tekrar yazman gerekmez.
                  </p>
                )}
              </div>
            )}
            <input type="hidden" name="profileId" value={selectedProfile ? selectedProfile.id : ""} />

            <div
              role="radiogroup"
              aria-label="Anlatım şekli"
              hidden={contextFromUser}
              className="mt-5 grid gap-2 sm:grid-cols-3"
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    mode === m.id
                      ? "border-pink-500 bg-white ring-2 ring-pink-500/20"
                      : "border-slate-200 bg-white/60 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">{m.title}</span>
                  <span className="block text-xs text-slate-500">{m.text}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="mode" value={mode} />

            <p className="mt-5 text-sm font-medium text-slate-800">Plan dili</p>
            <div role="radiogroup" aria-label="Plan dili" className="mt-2 grid gap-2 sm:grid-cols-2">
              {LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={language === code}
                  onClick={() => setLanguage(code)}
                  className={`rounded-xl border p-3 text-left transition ${
                    language === code
                      ? "border-pink-500 bg-white ring-2 ring-pink-500/20"
                      : "border-slate-200 bg-white/60 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">{LANGUAGE_LABELS[code]}</span>
                  <span className="block text-xs text-slate-500">
                    {code === "tr" ? "Hazır şablonlar Türkçedir" : "Çerçeveyi de yapay zekâ İngilizce kurar"}
                  </span>
                </button>
              ))}
            </div>
            <input type="hidden" name="language" value={language} />

            <p className="mt-5 text-sm font-medium text-slate-800">Plan ne kadar detaylı olsun?</p>
            <div role="radiogroup" aria-label="Plan uzunluğu" className="mt-2 grid gap-2 sm:grid-cols-2">
              {DETAIL_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={detail === d.id}
                  onClick={() => setDetail(d.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    detail === d.id
                      ? "border-pink-500 bg-white ring-2 ring-pink-500/20"
                      : "border-slate-200 bg-white/60 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">{d.title}</span>
                  <span className="block text-xs text-slate-500">{d.text}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="detail" value={detail} />
          </div>

          {contextFromUser && (
            <div className="mt-6">
              <label htmlFor="extra" className="block text-sm font-medium text-slate-800">
                Eklemek istediğin bir şey var mı? <span className="font-normal text-slate-500">(isteğe bağlı)</span>
              </label>
              <p className="mt-1 text-xs text-slate-500">
                {selectedProfile
                  ? `"${selectedProfile.name}" profilindeki bilgiler ve hafıza otomatik kullanılacak. Sadece bu plana özel durumu yaz.`
                  : "Rakam, tarih, kısıt gibi ayrıntılar planı belirgin şekilde iyileştirir."}
              </p>
              <textarea
                id="extra"
                name="extra"
                rows={4}
                maxLength={8000}
                className={`${inputClass} field-sizing-content min-h-24`}
              />
            </div>
          )}

          <div className="mt-6 space-y-5" hidden={contextFromUser}>
            {/* Tüm modların alanları DOM'da kalır; kullanıcı mod değiştirince yazdıkları kaybolmaz. */}
            {(["quick", "detailed"] as const).map((m) => (
              <div key={m} hidden={mode !== m} className="space-y-5">
                {INTAKE_QUESTIONS[m].map((q, i) => (
                  <div key={q.id}>
                    <label htmlFor={`${m}-${q.id}`} className="block text-sm font-medium text-slate-800">
                      {i + 1}. {q.label}
                    </label>
                    {q.multiline ? (
                      <textarea
                        id={`${m}-${q.id}`}
                        name={mode === m ? `ctx.${q.id}` : undefined}
                        placeholder={q.placeholder}
                        rows={2}
                        className={`${inputClass} field-sizing-content min-h-16`}
                      />
                    ) : (
                      <input
                        id={`${m}-${q.id}`}
                        name={mode === m ? `ctx.${q.id}` : undefined}
                        placeholder={q.placeholder}
                        className={inputClass}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div hidden={mode !== "free"}>
              <label htmlFor="free-text" className="block text-sm font-medium text-slate-800">
                Durumunu kendi cümlelerinle anlat
              </label>
              <p className="mt-1 text-xs text-slate-500">Şunlardan bahsetmen faydalı olur: {FREE_TEXT_HINTS.join(" · ")}</p>
              <textarea
                id="free-text"
                name={mode === "free" ? "ctx.free" : undefined}
                rows={10}
                placeholder="Örn. İstanbul'da 4 şubesi olan bir kahve zinciriyiz. Hafta içi öğleden sonraları satışlarımız düşük ve online sipariş kanalımız yok. 12 ay içinde cironun %20'sini online kanaldan elde etmek istiyoruz…"
                className={`${inputClass} field-sizing-content min-h-48`}
              />
            </div>
          </div>

          <FilePicker selection={fileSelection} id="files-context" />

          {personalizationEnabled && !contextFromUser && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="saveAsProfile"
                  value="1"
                  checked={saveAsProfile}
                  onChange={(e) => setSaveAsProfile(e.target.checked)}
                  className="mt-1 accent-pink-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">🧠 Bu bilgileri profil olarak kaydet</span>
                  <span className="block text-xs text-slate-600">
                    Bir dahaki planda tekrar yazmak yerine profili seçmen yeterli olur.
                  </span>
                </span>
              </label>
              {saveAsProfile && (
                <input
                  name="newProfileName"
                  required
                  maxLength={80}
                  placeholder="Profil adı, ör. İş yerim – Ege Zeytincilik"
                  className={`${inputClass} mt-3`}
                />
              )}
            </div>
          )}

          <StickyBar error={state.error} note={trialNote}>
            <div className="flex flex-wrap items-center gap-2">
              <SubmitButton
                name="ai"
                value="1"
                disabled={!canGenerate || !aiAvailable || !hasSelection}
                pendingText="Gönderiliyor…"
              >
                ✨ Bana özel planı oluştur
              </SubmitButton>
            </div>
          </StickyBar>
          {!aiAvailable && (
            <p className="mt-2 text-right text-xs text-amber-700">Yapay zekâ özelliği henüz yapılandırılmadı.</p>
          )}
        </div>
      )}
    </form>
  );
}

function StickyBar({ children, error, note }: { children: React.ReactNode; error?: string; note: string }) {
  return (
    <div className="sticky bottom-0 mt-6 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur">
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{note}</p>
        {children}
      </div>
    </div>
  );
}

function SubmitButton({
  children,
  name,
  value,
  disabled,
  pendingText,
}: {
  children: React.ReactNode;
  name: string;
  value: string;
  disabled?: boolean;
  pendingText?: string;
}) {
  const { pending, data } = useFormStatus();
  const isThis = pending && data?.get(name) === value;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isThis ? (pendingText ?? "İşleniyor…") : children}
    </button>
  );
}
