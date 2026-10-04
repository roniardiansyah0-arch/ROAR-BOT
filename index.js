const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AUTO NUKE MODE - WILL DELETE ALL CHANNELS ON STARTUP');
}).listen(PORT, () => console.log(`[WEB] Listening`));

const token = process.env.DISCORD_TOKEN.trim();
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`🔥 BOT ${client.user.tag} AUTO NUKE SIAP - MULAI HAPUS SEMUA!`);
  
  for (const guild of client.guilds.cache.values()) {
    console.log(`[AUTO NUKE] Target guild: ${guild.name} (${guild.id}) - Total channels: ${guild.channels.cache.size}`);
    await guild.channels.fetch();
    
    let count = 0;
    
    // 1. Hapus semua channel TEXT & VOICE dulu
    const allChannels = [...guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory).values()];
    console.log(`[AUTO NUKE] Akan hapus ${allChannels.length} channel...`);
    
    for (const ch of allChannels) {
      try {
        console.log(`[HAPUS] Channel: ${ch.name} | Type: ${ch.type}`);
        await ch.delete();
        count++;
        await new Promise(r => setTimeout(r, 500));
      } catch(e) {
        console.log(`[GAGAL] ${ch.name}: ${e.message} - Pastikan bot punya role ADMINISTRATOR di Discord!`);
      }
    }
    
    // 2. Hapus semua kategori
    await guild.channels.fetch();
    const allCats = [...guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).values()];
    console.log(`[AUTO NUKE] Akan hapus ${allCats.length} kategori...`);
    
    for (const cat of allCats) {
      try {
        console.log(`[HAPUS] Kategori: ${cat.name}`);
        await cat.delete();
        count++;
        await new Promise(r => setTimeout(r, 500));
      } catch(e) {
        console.log(`[GAGAL] Kategori ${cat.name}: ${e.message}`);
      }
    }
    
    console.log(`[AUTO NUKE] SELESAI! ${count} channel/kategori dihapus di ${guild.name}`);
    console.log(`[AUTO NUKE] Server sekarang kosong. Silahkan bikin 1 channel manual #general di Discord, lalu deploy file bersih.`);
  }
});

client.on('error', console.error);

client.login(token);
