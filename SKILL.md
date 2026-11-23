---
name: discord-profile-dashboard
description: Use when building a Discord OAuth2 dashboard for customizing profile-card backgrounds integrated with an existing Discord.js bot.
---

# Discord Profile Dashboard

Bangun dashboard web agar pengguna Discord dapat memilih background profile card yang digunakan bot saat command `/profile` dijalankan.

## Bahasa dan ruang lingkup

- Gunakan bahasa Indonesia untuk komunikasi dan teks antarmuka.
- Mulai dari pilihan background yang disediakan admin.
- Upload pribadi, warna aksen, dan bio adalah fitur lanjutan.
- Jangan menambahkan fitur lanjutan tanpa persetujuan pengguna.
- Jangan mengubah sistem ekonomi, leveling, atau reset season.

## Konteks bot

Bot sumber menggunakan:
- Node.js dan CommonJS.
- Discord.js v14.
- SQLite melalui better-sqlite3.
- @napi-rs/canvas untuk render kartu.

Lokasi yang perlu diperiksa pada repository bot:
- `src/cards/profileCard.js`
- `src/commands/general/profile.js`
- `src/cards/canvasKit.js`
- `src/database/schema.js`
- `src/database/index.js`
- `src/lib/paths.js`
- `assets/profile/Profile.jpeg`

Path ini adalah konteks awal, bukan asumsi bahwa file pasti ada di project baru. Periksa source aktual sebelum implementasi.

## Mulai pengerjaan

1. Baca instruksi project dan periksa dependensi yang tersedia.
2. Tanyakan lokasi repository bot dan akses integrasi yang tersedia.
3. Pastikan web dan bot berada pada host yang sama atau berbeda.
4. Sepakati stack web, deployment, domain, dan callback OAuth.
5. Tanyakan arah visual sebelum membuat UI.
6. Sajikan rencana integrasi sebelum mengubah bot atau database.
7. Jangan membaca token atau database produksi untuk eksplorasi.

## Arsitektur

Pisahkan:
- Frontend dashboard.
- Backend autentikasi dan pengaturan profil.
- Penyimpanan pengaturan dan katalog background.
- Integrasi renderer bot.

Backend menentukan identitas pengguna dari sesi login. Jangan mempercayai user ID yang dikirim browser.

Preferensi dipisahkan berdasarkan pasangan Discord user ID dan Discord guild ID.

Jangan mengakses database SQLite langsung dari browser. Jangan membagikan file SQLite melalui network filesystem.

Jika bot dan web berada pada host berbeda:
- Gunakan API backend dengan autentikasi service-to-service.
- Simpan credential layanan hanya pada server.
- Terapkan timeout dan fallback di sisi bot.
- Sepakati sumber data utama sebelum membuat implementasi.

Jika menggunakan SQLite bersama pada satu host:
- Pastikan akses file, WAL, transaksi, dan migrasi aman.
- Jangan menganggap semua platform hosting mendukung disk persisten.
- Hindari penyalinan database aktif sebagai mekanisme sinkronisasi.

## Login Discord

- Gunakan OAuth2 Authorization Code melalui backend.
- Minta scope minimum: `identify` dan `guilds` bila diperlukan.
- Jangan meminta scope `bot` untuk login pengguna.
- Validasi state OAuth dan gunakan PKCE bila didukung.
- Callback harus cocok dengan pengaturan Developer Portal.
- Simpan client secret hanya dalam environment backend.
- Gunakan cookie sesi HttpOnly, Secure pada HTTPS, dengan SameSite yang sesuai alur login.
- Terapkan masa berlaku sesi, logout, dan perlindungan CSRF.
- Jangan menyimpan token OAuth di localStorage.
- Jangan mencatat token atau authorization code dalam log.
- Periksa pengguna berhak mengakses guild yang dipilih.
- Periksa bot tersedia pada guild sebelum menawarkan integrasi.
- Administrator tidak boleh mengubah profil pengguna lain tanpa fitur dan pemeriksaan izin yang eksplisit.

## Fitur MVP

1. Login dan logout Discord.
2. Pilih server yang valid.
3. Tampilkan katalog background dari admin.
4. Preview profile card.
5. Simpan pilihan background.
6. Kembalikan pilihan ke background default.
7. `/profile` menggunakan preferensi tersimpan.

MVP tidak mencakup editor layout bebas atau upload publik.

## Model data

Rancang migrasi sesuai database aktual.

Katalog background minimal menyimpan:
- ID background stabil.
- Nama tampilan.
- Referensi aset internal.
- Status aktif.

Preferensi minimal menyimpan:
- userId.
- guildId.
- backgroundId.
- updatedAt.

Gunakan kombinasi userId dan guildId sebagai kunci unik. Simpan ID background, bukan path bebas dari browser. Tentukan perilaku ketika background dinonaktifkan atau dihapus.

Migrasi harus menjaga data lama dan dapat diuji pada database kosong maupun database versi sebelumnya.

## Integrasi renderer

- Tambahkan input background tanpa merusak pemanggil lama.
- Resolusi background dilakukan dari katalog yang diizinkan.
- Gunakan background bawaan jika preferensi belum ada, aset rusak, atau layanan pengaturan tidak tersedia.
- Pertahankan cover cropping dan rasio gambar.
- Pertahankan keterbacaan nama, progres XP, dan statistik.
- Akui interaksi Discord sebelum operasi lambat.
- Terapkan cache yang dapat diinvalidasi saat preferensi berubah.
- Jangan membuat kegagalan dashboard menghentikan `/profile`.

## Preview

- Usahakan preview memakai renderer yang sama dengan bot.
- Jangan membuat preview yang berbeda dari hasil Discord.
- Jika memakai data contoh, beri label "Data contoh".
- Jangan mengekspos statistik member lain.
- Batasi frekuensi render dan ukuran hasil.
- Pastikan preview dan penyimpanan memvalidasi guild serta pengguna.

## Upload pribadi, jika disetujui kemudian

- Validasi isi file melalui decode, bukan ekstensi saja.
- Batasi ukuran file, resolusi, dan jumlah pixel.
- Tetapkan format yang didukung.
- Re-encode gambar dan buang metadata yang tidak diperlukan.
- Gunakan nama objek acak dan storage non-executable.
- Jangan menerima SVG atau gambar animasi secara default.
- Jangan mengambil URL gambar bebas tanpa proteksi SSRF.
- Tolak path traversal dan akses aset di luar storage.
- Terapkan kuota, rate limit, dan pembersihan file tidak terpakai.
- Sepakati kebijakan konten dan penghapusan sebelum peluncuran.

## Antarmuka

- Sesuaikan arah visual dengan pengguna, bukan template generik.
- Buat responsif dan dapat digunakan dengan keyboard.
- Sediakan keadaan loading, kosong, gagal, dan berhasil.
- Tampilkan status penyimpanan dengan jelas.
- Background terkunci atau tidak tersedia harus dijelaskan.
- Jangan membuat tombol yang tidak memiliki perilaku nyata.
- Jangan menampilkan statistik atau testimoni fiktif.

## Verifikasi

Tambahkan tes untuk:
- OAuth state tidak valid dan sesi kedaluwarsa.
- Pengguna mencoba mengubah profil orang lain.
- Akses guild yang tidak diizinkan.
- Background ID tidak valid atau nonaktif.
- Preferensi terpisah antarserver.
- Penyimpanan dan reset ke default.
- Fallback renderer ketika aset/API gagal.
- Invalidasi cache setelah perubahan.
- Migrasi tanpa kehilangan data.
- Validasi upload jika fitur upload dibuat.

Jalankan lint, typecheck, build, dan tes yang tersedia. Jika command belum diketahui, periksa project dan tanyakan.

Uji login serta `/profile` pada server Discord uji. Jangan mengklaim integrasi produksi teruji jika hanya memakai mock.

## Batas perubahan dan penyerahan

- Jangan menyalin `.env`, token, atau database produksi ke paket.
- Jangan menjalankan reset season atau reset total untuk pengujian.
- Jangan membuat akun, membeli layanan, atau deploy tanpa izin.
- Jangan commit atau push tanpa permintaan.
- Dokumentasikan variabel environment tanpa nilai rahasia.
- Sertakan panduan setup, migrasi, deployment, dan rollback jika dokumentasi implementasi diminta.
- Setelah menambahkan skill, mulai sesi OpenCode baru agar konfigurasi dan skill dimuat ulang.

## Pemakaian pada project berikutnya

Salin file ini ke `.opencode/skills/discord-profile-dashboard/SKILL.md` pada project baru. Mulai ulang OpenCode, lalu minta implementasi dashboard menggunakan skill `discord-profile-dashboard`.
