# Discord Bot JS

Bot Discord dengan fitur ekonomi, poin otomatis dari chat & voice, dan game.

## Fitur

### Economy
- `/balance` - Cek saldo
- `/daily` - Ambil hadiah harian
- `/shop` - Lihat toko
- `/buy` - Beli item
- `/inventory` - Lihat inventaris
- `/give` - Beri uang ke user lain
- `/exchange` - Tukar item

### Points
- `/points` - Cek poin (otomatis dari chat & voice)

### General
- `/ping` - Cek latency bot
- `/profile` - Lihat profil
- `/rank` - Lihat rank
- `/leaderboard` - Lihat leaderboard
- `/guide` - Panduan menggunakan bot

## Tech Stack

- [Discord.js v14](https://discord.js.org/)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3) - Database
- [Node.js](https://nodejs.org/)

## Setup

### Prerequisites

- Node.js v16.9.0 atau lebih tinggi
- [Discord Developer Portal](https://discord.com/developers/applications) - Buat bot dan ambil token

### Installation

1. Clone repo ini:
```bash
git clone https://github.com/Yukyy21/discord-bot-js.git
cd discord-bot-js/discord-bot
```

2. Install dependencies:
```bash
npm install
```

3. Buat file `.env` dari `.env.example`:
```bash
cp .env.example .env
```

4. Isi file `.env` dengan token bot dan ID kamu:
```env
DISCORD_TOKEN=token_bot kamu
CLIENT_ID=id_client_bot
GUILD_ID=id_server kamu
POINT_CHANNEL_ID=id_channel_poin
```

5. Deploy slash commands:
```bash
npm run deploy
```

6. Jalankan bot:
```bash
npm start
```

## License

MIT
