// Katalog key ability item Epic ke atas. Hanya metadata; eksekusinya ada di
// src/database/abilities.js. Nama ability ("Kingslayer", dst) ikut di kolom
// effect tiap item karena satu key bisa dipakai beberapa item dengan angka beda.
//
// kind:
// - 'buff'    : memasang buff berdurasi atau berbatas pemakaian
// - 'instant' : efek langsung sekali jalan
// boss: true berarti angkanya baru terasa setelah sistem mini boss ada
// (rencana lengkap di Docs/bossplan.md).

const ABILITIES = {
  boss_damage:      { kind: 'buff',    boss: true,  text: 'Damage ke boss dikali' },
  boss_loot_rate:   { kind: 'buff',    boss: true,  text: 'Peluang boss menjatuhkan loot dikali' },
  boss_drop_amount: { kind: 'buff',    boss: true,  text: 'Jumlah drop boss dikali, berlaku 1 kali kill' },
  quest:            { kind: 'buff',    boss: false, text: 'Progres quest dikali' },
  quest_coin:       { kind: 'buff',    boss: false, text: 'Coin dari quest dan boss dikali' },
  no_consume:       { kind: 'buff',    boss: false, text: 'Pemakaian /use berikutnya tidak menghabiskan item' },
  all_mult:         { kind: 'buff',    boss: false, text: 'Coin, XP, dan Poin dikali' },
  server_xp:        { kind: 'buff',    boss: false, text: 'XP seluruh member server dikali' },
  duration:         { kind: 'buff',    boss: false, text: 'Buff yang dipasang setelah ini bertahan lebih lama' },
  daily_reset:      { kind: 'instant', boss: false, text: 'Cooldown /daily direset' },
  extend_buffs:     { kind: 'instant', boss: false, text: 'Semua buff aktif diperpanjang' },
  xp_fill:          { kind: 'instant', boss: false, text: 'XP langsung penuh sampai level berikutnya' },
  cooldown_reset:   { kind: 'instant', boss: false, text: 'Semua cooldown milikmu direset' },
};

const isBossAbility = key => ABILITIES[key]?.boss === true;

module.exports = { ABILITIES, isBossAbility };
