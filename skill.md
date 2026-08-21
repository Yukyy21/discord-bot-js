# Skill / Changelog — Discord Bot

## 2026-08-21 — Gambar Item di /shop & /inventory

### Fitur Baru
- **`/shop`** sekarang menampilkan **papan gambar** berisi semua item stock (grid 2 kolom):
  foto item, ID, nama, tier (warna sesuai tier), dan harga.
- **`/inventory`** sekarang juga menampilkan gambar kartu grid berisi item yang dimiliki + jumlah.

### File Baru
- `utils/shopCard.js` — render kartu grid item pakai `@napi-rs/canvas`:
  - `buildShopCard(items)` → papan shop
  - `buildInventoryCard(items)` → papan inventori
  - Gambar diambil dari `assets/items/{id}.png` via `utils/itemImages.js`
  - Gambar hilang → placeholder tanda tanya; nama panjang otomatis dipotong (`…`)

### File Diubah
- `commands/economy/shop.js`
  - Pakai `deferReply()` dulu, lalu `editReply()` dengan 1 file `shop.png` via `embed.setImage()`
  - Alasan: upload banyak gambar langsung di `reply()` bisa lewat batas 3 detik Discord
- `commands/economy/inventory.js`
  - Sama seperti shop: `deferReply()` + 1 gambar `inventory.png`
  - Sebelumnya: lampiran gambar lepas + tanpa defer → sering error `10062`

### Masalah yang Diperbaiki
1. **`10062 Unknown interaction`** — bot membalas interaksi > 3 detik.
   Solusi: selalu `deferReply()` di awal command yang melakukan render/upload gambar.
2. **`40060 Interaction has already been acknowledged`** — penyebabnya **2 proses bot
   jalan bersamaan** (instance lama belum dimatikan saat restart). Dua instance konek
   pakai token sama lalu saling tabrakan respon interaksi.
   Solusi: pastikan cuma 1 proses `node index.js` yang jalan.
   Cek proses: `Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"`
   Matikan: `taskkill /F /PID <pid>`
3. **Penting:** Node menyimpan module di cache saat startup. Setiap ubah kode,
   **wajib restart bot** agar perubahan aktif.

### Catatan Lain
- Saldo user test (`987011050811580456`) ditambah 999.999 coin di semua server untuk testing.
- Asset item: `assets/items/1.png` – `30.png` (sudah lengkap, penamaan = ID item).
