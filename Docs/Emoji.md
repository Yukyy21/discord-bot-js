# Sistem Emoji

Semua emoji bot dipanggil lewat nama, bukan ditulis langsung di command:

```js
const { e } = require('../../lib/emojis');

`${e('coin')} 1.500` // -> <:coin:1234567890> 1.500
```

Kalau nama tidak dikenal, helper mengembalikan string kosong — pesan tetap
terkirim, hanya tanpa ikon. Tidak ada command yang error gara-gara emoji.

## Mengganti Emoji

1. Upload emoji ke aplikasi bot (Developer Portal > Emojis) atau ke server.
2. Ambil ID-nya: ketik `\:nama:` di Discord, hasilnya `<:nama:123456789>`.
3. Tambahkan ke `EMOJI_IDS` di `src/config/index.js`.

Nama yang belum diisi akan jatuh ke padanan unicode di `src/lib/emojis.js`.

## Helper

| Fungsi | Kegunaan |
|---|---|
| `e(nama)` | String emoji siap tempel di teks embed |
| `eo(nama)` | Bentuk objek `{ id, name }` untuk tombol dan select menu |
| `medal(index)` | Medali emas/perak/perunggu untuk tiga besar, sisanya nomor urut |
| `tierEmoji(tier)` | Ikon tier rank (Novice … Demigod) |

`eo()` ada karena Discord tidak menerima string emoji di properti `emoji` pada
komponen — harus objek. Salah pakai di sini bikin tombolnya gagal dikirim.
