import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/config/app";

export const metadata: Metadata = {
  title: "Yasal bilgiler",
  description: `${APP_NAME} kullanım koşulları, gizlilik ve KVKK aydınlatma metni.`,
};

const SECTIONS = [
  { id: "kosullar", label: "Kullanım Koşulları" },
  { id: "aydinlatma", label: "KVKK Aydınlatma Metni" },
  { id: "yurtdisi", label: "Yurt Dışına Aktarım" },
  { id: "cerez", label: "Çerezler" },
  { id: "sorumluluk", label: "Sorumluluk Reddi" },
  { id: "iletisim", label: "İletişim" },
];

/**
 * Yasal metinler. Taslaktır: yayına almadan ve ücret tahsil etmeye başlamadan
 * önce bir hukukçuya okutulmalı, köşeli parantezli alanlar doldurulmalıdır.
 */
export default function LegalPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <Link href="/giris" className="text-sm font-medium text-slate-700 hover:underline">
            Giriş yap
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Yasal bilgiler</h1>
        <p className="mt-2 text-slate-600">Son güncelleme: 21 Eylül 2026</p>

        <nav aria-label="Bölümler" className="mt-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-12 text-slate-700">
          <section id="kosullar" className="scroll-mt-20">
            <h2 className="text-xl font-semibold text-slate-900">1. Kullanım Koşulları</h2>
            <p className="mt-3">
              {APP_NAME} (&quot;Hizmet&quot;), kullanıcının verdiği bilgilerden yapay zekâ yardımıyla iş dokümanları
              (şablon, checklist, plan) üreten bir platformdur. Hizmeti kullanarak bu koşulları kabul etmiş olursunuz.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>Hesabınızın güvenliğinden ve paylaştığınız içerikten siz sorumlusunuz.</li>
              <li>
                Başkasına ait kişisel verileri veya gizli bilgileri, yetkiniz olmadan Hizmete yüklememelisiniz. Yüklenen
                dosyalarda bu sorumluluk kullanıcıya aittir.
              </li>
              <li>
                Hizmeti hukuka aykırı amaçlarla, sistemi aşırı yükleyecek otomasyonlarla veya başkalarının haklarını
                ihlal edecek şekilde kullanamazsınız.
              </li>
              <li>
                Ürettiğiniz dokümanların içeriği size aittir; bunları dilediğiniz gibi kullanabilir, düzenleyebilir ve
                paylaşabilirsiniz.
              </li>
              <li>
                Bir plan için paylaşım bağlantısı oluşturduğunuzda, bağlantıya sahip herkes planın içeriğini giriş
                yapmadan görüntüleyebilir. Plan için anlattığınız durum, profil bilgileriniz ve eklediğiniz dosyalar
                paylaşılmaz. Paylaşımı istediğiniz an kapatabilirsiniz; kapatılan bağlantı çalışmaz.
              </li>
              <li>
                Hizmet geliştirme aşamasındadır; özellikler değişebilir, kesinti yaşanabilir. Önemli değişiklikler
                önceden duyurulur.
              </li>
              <li>Koşullara aykırı kullanım hâlinde hesabınız askıya alınabilir.</li>
            </ul>
            <p className="mt-4 text-sm text-slate-600">
              Ücretli plana geçildiğinde mesafeli satış sözleşmesi, iptal ve iade koşulları bu sayfaya eklenecektir.
            </p>
          </section>

          <section id="aydinlatma" className="scroll-mt-20">
            <h2 className="text-xl font-semibold text-slate-900">2. KVKK Aydınlatma Metni</h2>
            <p className="mt-3">
              6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu [şirket/şahıs unvanı]&apos;dır.
            </p>

            <h3 className="mt-5 font-semibold text-slate-900">İşlenen veriler</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Hesap verileri:</strong> e-posta adresi, görünen ad, şifrenin geri döndürülemez (hash&apos;li)
                hâli, oturum kayıtları.
              </li>
              <li>
                <strong>İçerik verileri:</strong> profil bilgileriniz, hafızaya kaydettiğiniz notlar ve kararlar,
                oluşturduğunuz dokümanlar, plan oluştururken yazdığınız metinler.
              </li>
              <li>
                <strong>Dosyalar:</strong> plana eklediğiniz görsel, PDF veya metin dosyalarının içeriği. Bu dosyalar
                sunucularımızda <strong>saklanmaz</strong>; yalnızca o planın üretimi sırasında işlenir, dokümana
                yalnızca dosya adı ve türü kaydedilir.
              </li>
              <li>
                <strong>Ödeme verileri:</strong> ücretli plana geçildiğinde ödeme işlemleri Stripe üzerinden yürütülür;
                kart bilgileri tarafımızca görülmez ve saklanmaz.
              </li>
            </ul>

            <h3 className="mt-5 font-semibold text-slate-900">İşleme amaçları ve hukuki sebep</h3>
            <p className="mt-2">
              Veriler; hizmetin sunulması, hesabınızın yönetimi, talep ettiğiniz dokümanların üretilmesi, güvenliğin
              sağlanması ve yasal yükümlülüklerin yerine getirilmesi amacıyla, sözleşmenin ifası ve meşru menfaat hukuki
              sebeplerine dayanılarak işlenir.
            </p>

            <h3 className="mt-5 font-semibold text-slate-900">Saklama ve silme</h3>
            <p className="mt-2">
              Veriler hesabınız açık olduğu sürece saklanır. Ayarlar sayfasından profillerinizi, hafızanızı ve
              dokümanlarınızı silebilir, tüm verilerinizi JSON olarak indirebilir veya hesabınızı tamamen
              silebilirsiniz. Hesap silindiğinde verileriniz kalıcı olarak kaldırılır.
            </p>

            <h3 className="mt-5 font-semibold text-slate-900">Haklarınız</h3>
            <p className="mt-2">
              KVKK m.11 uyarınca verilerinize erişme, düzeltilmesini veya silinmesini isteme, işlemeye itiraz etme
              haklarına sahipsiniz. Taleplerinizi aşağıdaki iletişim adresine iletebilirsiniz.
            </p>
          </section>

          <section id="yurtdisi" className="scroll-mt-20">
            <h2 className="text-xl font-semibold text-slate-900">3. Yurt Dışına Veri Aktarımı</h2>
            <p className="mt-3">Hizmetin çalışması için verileriniz şu sağlayıcılarla paylaşılır:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Anthropic (Claude, ABD):</strong> Doküman üretimi için, o üretime konu olan bilgiler (anlatımınız,
                seçilen profil ve hafıza içeriği, eklediğiniz dosyalar) yapay zekâ modeline gönderilir.
              </li>
              <li>
                <strong>Supabase (veritabanı ve kimlik doğrulama):</strong> Hesap ve içerik verileri burada barındırılır.
              </li>
              <li>
                <strong>Vercel (barındırma)</strong> ve <strong>Stripe (ödeme)</strong>: hizmetin sunumu ve ödeme
                işlemleri için.
              </li>
            </ul>
            <p className="mt-3">
              Bu aktarım, hizmetin talep ettiğiniz şekilde sunulabilmesi için zorunludur. Kişisel veri içeren bilgileri
              paylaşmak istemiyorsanız, plan oluştururken bu bilgileri anonimleştirebilir veya Ayarlar&apos;dan
              kişiselleştirmeyi kapatabilirsiniz.
            </p>
          </section>

          <section id="cerez" className="scroll-mt-20">
            <h2 className="text-xl font-semibold text-slate-900">4. Çerezler</h2>
            <p className="mt-3">
              Yalnızca <strong>zorunlu çerezler</strong> kullanılır: oturumunuzun açık kalmasını sağlayan kimlik
              doğrulama çerezleri. Reklam, izleme veya profilleme amaçlı üçüncü taraf çerezi kullanılmaz. Çerezleri
              tarayıcınızdan silebilirsiniz; bu durumda oturumunuz kapanır.
            </p>
          </section>

          <section id="sorumluluk" className="scroll-mt-20">
            <h2 className="text-xl font-semibold text-slate-900">5. Sorumluluk Reddi</h2>
            <p className="mt-3">
              {APP_NAME} çıktıları <strong>karar desteği</strong> amaçlıdır; hukuki, mali, vergisel veya mesleki
              danışmanlık yerine geçmez. Yapay zekâ tarafından üretilen içerik hatalı, eksik veya güncel olmayan bilgi
              içerebilir; tahminler ve varsayımlar doküman içinde işaretlenir.
            </p>
            <p className="mt-3">
              Özellikle mevzuat, vergi, sözleşme ve finansal tutar içeren konularda uygulamaya geçmeden önce ilgili
              kurumdan veya bir uzmandan teyit almanız gerekir. Çıktılara dayanarak alınan kararların sonuçlarından
              kullanıcı sorumludur.
            </p>
          </section>

          <section id="iletisim" className="scroll-mt-20">
            <h2 className="text-xl font-semibold text-slate-900">6. İletişim</h2>
            <p className="mt-3">
              Veri sorumlusu: [şirket/şahıs unvanı] · E-posta: [iletisim@ornek.com] · Adres: [adres]
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Bu metinler taslaktır. Yayına almadan ve ücret tahsil etmeye başlamadan önce köşeli parantezli alanlar
              doldurulmalı ve metinler bir hukukçu tarafından gözden geçirilmelidir.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-6 text-sm text-slate-500">
          <Link href="/" className="hover:underline">
            ← Ana sayfa
          </Link>
        </div>
      </footer>
    </div>
  );
}
