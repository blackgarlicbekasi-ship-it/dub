const Mono = ({ children }: { children: string }) => (
  <span className="font-mono text-neutral-700">{children}</span>
);

const SectionTitle = ({ children }: { children: string }) => (
  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
    {children}
  </h4>
);

export function UsageGuide() {
  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-medium text-neutral-700">
        Panduan Penggunaan Bot
      </h3>
      <p className="mt-0.5 text-sm text-neutral-500">
        Ikuti langkah berikut untuk menyiapkan dan menggunakan bot di grup
        Telegram Anda.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <SectionTitle>1. Cara Menambahkan Bot</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-500">
            <li>
              Buka <Mono>@BotFather</Mono> di Telegram, kirim{" "}
              <Mono>/newbot</Mono>, lalu salin token yang diberikan.
            </li>
            <li>
              Klik tombol <span className="text-neutral-700">Add Bot</span> di
              halaman ini, lalu isi Name, Bot Token, dan Chat ID grup.
            </li>
            <li>
              Untuk mendapatkan Chat ID, tambahkan{" "}
              <Mono>@userinfobot</Mono> ke grup Anda dan bot itu akan
              menampilkan ID grupnya. ID grup selalu diawali tanda minus,
              contoh <Mono>-100123456789</Mono>.
            </li>
          </ul>
        </div>

        <div>
          <SectionTitle>2. Menghubungkan Bot ke Grup</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-500">
            <li>Tambahkan bot ke grup Telegram Anda.</li>
            <li>
              Jadikan bot sebagai admin grup. Langkah ini wajib. Tanpa status
              admin, bot tidak bisa merespons perintah apa pun.
            </li>
            <li>
              Klik tombol <span className="text-neutral-700">Connect</span> pada
              kolom Webhook agar bot mulai menerima perintah.
            </li>
          </ul>
        </div>

        <div>
          <SectionTitle>3. Cara Mengganti URL Lewat Bot</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-500">
            <li>
              Ketik <Mono>/ganti</Mono> di dalam grup.
            </li>
            <li>Bot akan menanyakan URL lama. Balas dengan URL lama.</li>
            <li>Bot akan menanyakan URL baru. Balas dengan URL baru.</li>
            <li>
              Semua link milik Anda yang mengandung URL lama akan diganti.
              Bagian path atau nama halaman tetap utuh.
            </li>
            <li>
              Jika tidak ada link yang cocok, bot menjawab{" "}
              <Mono>Updated: 0</Mono> dan sesi selesai tanpa mengubah apa pun.
            </li>
          </ul>
        </div>

        <div>
          <SectionTitle>4. Perhatikan Format URL</SectionTitle>
          <p className="text-sm text-neutral-500">
            Aturan utama: URL lama dan URL baru harus ditulis dengan format yang
            sama persis.
          </p>

          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3">
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              Benar
            </span>
            <ul className="mt-2 space-y-1 text-sm text-neutral-500">
              <li>
                <Mono>abc.com</Mono> ke <Mono>bcd.com</Mono>
              </li>
              <li>
                <Mono>https://abc.com</Mono> ke <Mono>https://bcd.com</Mono>
              </li>
              <li>
                <Mono>https://abc.com/</Mono> ke <Mono>https://bcd.com/</Mono>
              </li>
            </ul>
            <p className="mt-2 text-sm text-neutral-500">
              Untuk link <Mono>https://abc.com/page-1</Mono> hasilnya menjadi{" "}
              <Mono>https://bcd.com/page-1</Mono>.
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3">
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              Salah
            </span>
            <ul className="mt-2 space-y-2 text-sm text-neutral-500">
              <li>
                <Mono>https://abc.com/</Mono> ke <Mono>https://bcd.com</Mono>
                <br />
                Slash hilang, sehingga{" "}
                <Mono>https://abc.com/page-1</Mono> berubah menjadi{" "}
                <Mono>https://bcd.compage-1</Mono> dan link rusak.
              </li>
              <li>
                <Mono>abc.com</Mono> ke <Mono>https://bcd.com</Mono>
                <br />
                Protokol dobel, sehingga{" "}
                <Mono>https://abc.com/page-1</Mono> berubah menjadi{" "}
                <Mono>https://https://bcd.com/page-1</Mono> dan link rusak.
              </li>
            </ul>
          </div>

          <p className="mt-3 text-sm text-neutral-500">
            Aturan sederhana: kalau URL lama pakai <Mono>https://</Mono>, URL
            baru juga pakai <Mono>https://</Mono>. Kalau URL lama diakhiri
            slash, URL baru juga diakhiri slash. Samakan bentuknya persis.
          </p>
        </div>

        <div>
          <SectionTitle>5. Aturan Penting</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-500">
            <li>
              Hanya admin atau creator grup yang bisa menjalankan perintah.
            </li>
            <li>
              Setiap sesi <Mono>/ganti</Mono> kedaluwarsa dalam 20 detik jika
              tidak dijawab. Mulai lagi dengan <Mono>/ganti</Mono>.
            </li>
            <li>
              Bot hanya mengganti link milik Anda dan tidak pernah menyentuh
              link pengguna lain.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
