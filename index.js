const { Client, GatewayIntentBits, Events, ChannelType, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ROAR CREW - HAPUS MODE - ' + new Date().toISOString());
}).listen(PORT, () => console.log(`[WEB] Listening on ${PORT}`));

const token = (process.env.DISCORD_TOKEN || '').trim();
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const commands = [
  new SlashCommandBuilder().setName('hapus-semua').setDescription('HAPUS SEMUA CHANNEL & KATEGORI (Admin only) - PAKAI SEKALI AJA'),
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  console.log('[SLASH] Registering hapus-semua...');
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('[SLASH] Registered!');
}

client.once(Events.ClientReady, async () => {
  console.log(`🦁 ${client.user.tag} MODE HAPUS SIAP!`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'hapus-semua') return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Hanya admin!', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  let deleted = 0;

  console.log(`[HAPUS] Dimulai oleh ${interaction.user.tag} di ${guild.name}`);

  // Simpan channel tempat command dijalankan biar bisa bales dulu
  const keepChannelId = interaction.channelId;

  // 1. Hapus semua channel dulu (text & voice) KECUALI channel tempat command
  const allChannels = guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory);
  for (const ch of allChannels.values()) {
    if (ch.id === keepChannelId) continue;
    if (ch.name.includes('ticket-') && ch.name !== 'ticket') {
      // skip ticket aktif biar ga error, tapi tetap hapus kalau mau
      console.log(`[HAPUS] Skip ticket aktif: ${ch.name}`);
      continue;
    }
    try {
      console.log(`[HAPUS] Channel: ${ch.name}`);
      await ch.delete();
      deleted++;
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.log(`[HAPUS] Gagal ${ch.name}: ${e.message}`);
    }
  }

  // 2. Hapus semua kategori
  const allCats = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);
  for (const cat of allCats.values()) {
    try {
      console.log(`[HAPUS] Kategori: ${cat.name}`);
      await cat.delete();
      deleted++;
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.log(`[HAPUS] Gagal cat ${cat.name}: ${e.message}`);
    }
  }

  // 3. Terakhir hapus channel tempat command (bot akan bikin channel baru otomatis nanti pas deploy file baru)
  // Kita bales dulu baru hapus
  await interaction.editReply(`💣 **SELESAI!** ${deleted} channel & kategori berhasil dihapus.\n\nSekarang server kosong. **LANGSUNG GANTI FILE DI GITHUB KE FILE BERSIH (index.js baru)**, deploy ulang di Render, terus ketik /setup-roar`);

  // Tunggu 5 detik baru hapus channel terakhir
  setTimeout(async () => {
    try {
      const lastCh = guild.channels.cache.get(keepChannelId);
      if (lastCh) {
        console.log(`[HAPUS] Hapus channel terakhir: ${lastCh.name}`);
        await lastCh.delete();
      }
    } catch (e) {}
  }, 5000);
});

client.login(token);
