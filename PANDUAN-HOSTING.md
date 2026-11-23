# Panduan update bot untuk hosting

## Isi paket

Paket ini berisi `src/`, `assets/`, `scripts/`, `package.json`, `package-lock.json`, dan panduan ini. Struktur folder harus dipertahankan. Ini adalah paket update aplikasi, bukan backup data.

Tidak disertakan: `.env`, database SQLite, folder `data/`, `node_modules/`, dan konfigurasi OpenCode. Gunakan token dan konfigurasi environment milik hosting yang sudah ada. Jangan menghapus atau menimpa `.env` dan database produksi.

## Sebelum update

1. Pastikan direktori instalasi yang akan diperbarui benar.
2. Backup database dengan `npm run backup` pada instalasi lama bila skrip tersebut tersedia. Salinan tersimpan di `data/backups/`; simpan juga di lokasi terpisah dari instalasi bot.
3. Backup source lama, aset lama, dan konfigurasi environment secara privat untuk rollback.
4. Hentikan proses bot lewat panel hosting atau process manager. Jangan menjalankan dua instance bot dengan database yang sama.
5. Database aktif versi ini berada di `data/economy.db`. Jika instalasi lama memakai database di lokasi lain, pastikan pemindahannya benar sebelum startup. Jangan menganggap `economy.db` di root adalah database aktif. Jika melakukan backup manual SQLite, hentikan bot terlebih dahulu dan perhatikan file WAL/SHM yang terkait.

## Pemasangan

1. Ekstrak ZIP ke direktori sementara, bukan langsung ke instalasi produksi.
2. Salin folder `src/`, `assets/`, `scripts/`, serta `package.json` dan `package-lock.json` ke root aplikasi. Pertahankan `data/` dan `.env` milik hosting.
3. Jalankan `npm ci --omit=dev` di root aplikasi. Gunakan Node.js yang kompatibel dengan versi `better-sqlite3` dalam lockfile. Dependensi native harus dipasang pada OS hosting; jangan menyalin `node_modules` dari Windows.
4. Jalankan `npm start`, atau restart aplikasi melalui process manager dengan entry point `src/index.js` dan working directory root project.
5. Periksa log startup. Tabel arsip season dibuat otomatis saat database diinisialisasi, tanpa perlu menghapus database lama.
6. Untuk tombol dan UI saja tidak perlu deploy ulang slash command. Jika definisi slash command di hosting tertinggal dari source paket ini, jalankan `npm run deploy` sekali menggunakan konfigurasi environment hosting.

## Perubahan utama

- Tampilan profile card dan leaderboard card diperbarui; aset dan font disertakan agar render konsisten.
- Leaderboard card merespons awal dengan deferral sebelum mengambil avatar dan merender gambar untuk menghindari timeout Discord.
- Tombol Arsip Season, Reset Season (Admin), dan Reset Total (Admin) tersedia pada leaderboard card yang baru dipanggil.
- Reset memerlukan izin Administrator saat digunakan dan konfirmasi khusus pemohon yang berlaku 60 detik. Tombol di pesan publik tetap terlihat semua anggota, tetapi pengguna tanpa izin ditolak.

## Perbedaan reset

### Reset Season

Mengarsipkan statistik akhir kemudian menolkan poin, coin dompet, saldo bank, jam voice, dan poin mingguan anggota pada server tempat tombol dipakai. XP, level/rank, inventory, dan streak tetap disimpan. Sesi voice aktif dihitung ulang mulai waktu reset supaya durasi lama tidak masuk kembali. Arsip dapat dilihat melalui tombol Arsip Season.

### Reset Total

Menghapus data member aktif pada server tempat tombol dipakai, termasuk progres ekonomi/aktivitas, level, inventory, streak, dan data staff. Arsip season yang sudah ada dan pengaturan server dipertahankan. Data server lain tidak dihapus. Ini bukan penghapusan file database seluruh bot. Jangan menganggap Reset Total otomatis mengarsipkan semua data aktif; simpan backup dan lakukan arsip season lebih dahulu bila diperlukan.

Kedua tindakan bersifat destruktif. Menginstal atau menjalankan bot tidak otomatis melakukan reset. Jangan menekan konfirmasi reset di produksi hanya untuk menguji tombol.

## Pengujian setelah update

1. Gunakan server uji terlebih dahulu.
2. Jalankan `/profile` dan `/leaderboard card`; pastikan gambar dan dropdown kategori bekerja.
3. Pastikan anggota nonadmin ditolak saat mencoba reset.
4. Buka konfirmasi sebagai admin lalu klik Batal; pastikan data tidak berubah.
5. Hanya pada server uji, konfirmasi reset season dan periksa nilai yang direset serta progres yang dipertahankan. Buka Arsip Season untuk memeriksa hasil lama.
6. Uji Reset Total pada server uji terpisah dan periksa bahwa arsip serta pengaturan server tetap ada.
7. Jika ada pengguna di voice saat reset, keluar beberapa saat setelah reset. Durasi lama tidak boleh dikreditkan lagi.
8. Pesan leaderboard lama adalah snapshot. Jalankan ulang `/leaderboard card` setelah update/reset untuk memperoleh gambar dan tombol terbaru.

Verifikasi pengembangan terakhir: lint bersih dan 150 tes lulus. Pengujian interaksi dilakukan dengan mock dan database terisolasi; click-through pada Discord produksi belum diverifikasi.

## Rollback

Hentikan bot, pulihkan source/aset serta manifest dependensi dari backup, pasang ulang dependensi, dan pulihkan database dari backup yang sesuai jika diperlukan. Simpan database versi bermasalah secara terpisah sebelum pemulihan agar tidak kehilangan bahan diagnosis. Jangan memulihkan database saat bot masih berjalan.
