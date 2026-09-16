# Changelog V2

Lanjutan dari [Changelog lama](<Changelog(new changelog avail, do not update this).md>)
(dibekukan, jangan diedit lagi) — entri baru ditambah di sini, terbaru di atas.

## Poruv Shop Bisa Diatur, Redeem Code, Buff Admin, Give Item

Empat fitur baru sekaligus, semuanya berpusat di sekitar Poruv Shop dan
pemberian reward manual oleh admin.

**`/poruv-shop-set` (admin) — katalog `/poruv-shop` per server.**
- Subcommand `add`/`edit`/`remove`/`list`. Item punya nama, harga, emoji,
  deskripsi, dan tipe fulfillment (`manual` — antre `/poruv-resolve` seperti
  sebelumnya, atau `mythic_random` — otomatis genap 1 item Mythic acak dari
  katalog `/shop`, langsung masuk `/inventory`).
- Tabel baru `poruv_shop_items` (`guildId, key, name, emoji, price,
  description, fulfillment, sortOrder, createdAt`). Guild yang belum pernah
  memakai command ini **tidak punya baris apa pun** di tabel — `/poruv-shop`
  tetap jalan normal pakai default bawaan (`PORUV_SHOP` di
  `src/config/constants.js`), tanpa menulis apa pun ke DB. Begitu admin
  pertama kali `add`/`edit`/`remove`, `ensureSeeded()` di
  `src/database/poruvShop.js` menyalin seluruh default ke tabel untuk guild
  itu lebih dulu — supaya item bawaan (Owocash, dst) ikut bisa
  diedit/dihapus, bukan cuma item baru yang bisa diatur.
- Emoji item **tidak lagi harus** key di registry `src/lib/emojis.js` — admin
  bisa memilih emoji apa saja (unicode atau custom) lewat emoji picker bawaan
  Discord di kolom teks `emoji`. Helper baru `parseEmojiInput()` di
  `src/lib/emojis.js` mem-parsing teks mention `<a:nama:id>`/`<:nama:id>`
  jadi bentuk `{id, name, animated}` untuk `ButtonBuilder#setEmoji()`, atau
  meloloskan string unicode apa adanya.
- `src/commands/economy/poruvShop.js` dirombak: `buildPoruvShop()` sekarang
  membaca `getPoruvShopItems(guildId)`, render sampai 5 baris tombol (maks 25
  item dengan tombol redeem; lebih dari itu tetap tampil di teks tanpa
  tombol).

**`/code-create` (admin) → `/redeem` (semua member) — redeem code campuran.**
- Beda dari Poruv Shop: satu code bisa membagikan **campuran** reward Poruv,
  XP, Coin, Buff, **dan** Item (item boleh lebih dari satu jenis) sekaligus,
  bukan satu jenis barang per klaim.
- Alur 3 langkah karena modal Discord maksimum 5 text input: `/code-create
  code: expired-hari: max-redeem:` → dropdown pilih jenis reward (maks 5,
  pas dengan jumlah field modal) → modal dinamis isi nilainya (cuma field
  yang dipilih yang muncul). Ditangani lewat `StringSelectMenuBuilder` +
  `ModalBuilder` baru di `src/commands/admin/codeCreate.js`, dan
  `interactionCreate.js` ditambah cabang `isModalSubmit()` (baru — sebelumnya
  tidak ada handler modal sama sekali) plus dispatch select-menu
  `code_create_select:*`.
- Parsing & validasi field ada di `src/lib/redeemCodes.js` (murni, tanpa
  SQL/Discord — gampang dites): `parseAmountField` (Poruv/XP/Coin, angka
  bulat positif), `parseBuffField` (format `key nilai menit`, key dibatasi
  `coin`/`xp`/`points`/`boss_damage`), `parseItemField` (satu baris per item,
  `itemId jumlah`). Kalau satu field saja formatnya salah, **seluruh code
  batal dibuat** — tidak ada yang diam-diam terlewat.
- Tabel baru `redeem_codes` (`code, guildId, createdBy, createdAt, expiresAt,
  maxUses, usesCount, rewards` — rewards array JSON) dan `redeem_code_uses`
  (`code, guildId, userId, redeemedAt`, primary key gabungan — satu user
  cuma bisa redeem satu code sekali). Logic di `src/database/redeemCodes.js`
  (`createRedeemCode`, `redeemCode`) — validasi ada/belum expired/kuota/belum
  pernah redeem, lalu terapkan semua reward + catat pemakaian dalam **satu
  transaksi**.
- `grantItem()` di `src/database/shop.js` sekarang menerima parameter `qty`
  (default 1, backward compatible) — dipakai ulang oleh reward item redeem
  code dan `/give-item`.
- Reward XP dari `/redeem` memicu `reconcileLevels()` susulan (pola yang sama
  dengan `/use`), supaya level-up langsung ter-reconcile.

**`/buff-apply user: buff: duration:` (admin) — buff eksklusif admin.**
- Preset di `BUFF_APPLY_PRESETS` (`src/config/constants.js`) — buff di sini
  **sengaja tidak tercapai** lewat item, `/shop`, atau redeem code, cuma
  admin yang bisa memasangnya.
- Preset pertama: **Beta Tester** — damage boss ×1.15, XP ×1.2, coin ×1.3
  sekaligus (tiga baris `addBuff()` dengan durasi sama). Key buff yang
  dipakai (`boss_damage`, `xp`, `coin`) generik, sama dengan sistem buff
  item — otomatis ikut aturan "pengali terbesar menang" kalau user juga
  punya buff sejenis dari item lain.

**`/give-item user: id: jumlah:` (admin) — beri item shop langsung.**
- Panggil `grantItem()` langsung dengan `itemId` dari katalog `/shop`, tanpa
  mengurangi coin siapa pun. Dipakai buat kompensasi/hadiah event tanpa lewat
  rotasi stok `/shop`.

**Lain-lain.**
- `resetUser()` (`src/database/admin.js`) sekarang juga menghapus
  `redeem_code_uses` milik user — total 11 tabel dibersihkan dalam satu
  transaksi (bertambah dari yang sebelumnya). Embed `/admin reset-user`
  menampilkan baris baru ini.
- Dokumentasi diperbarui: [Bot.md](Bot.md) (bagian Poruv Shop dirombak +
  bagian Redeem Code baru + bagian Buff Admin/Give Item baru),
  [ai.md](ai.md) (basis pengetahuan `/ai-ask` — command baru, bagian 3c
  Redeem Code baru, catatan buff eksklusif di bagian 5, FAQ baru), dan
  [Emoji.md](Emoji.md) (emoji Poruv Shop custom + emoji buff admin).

**Belum dijalankan di lingkungan pembuatan patch ini** (tanpa akses
`npm install`/registry): `npm test` dan `npm run lint`. Tolong jalankan
keduanya sebelum deploy ke production. Command baru juga baru terdaftar ke
Discord setelah `npm run deploy` dijalankan sekali.
