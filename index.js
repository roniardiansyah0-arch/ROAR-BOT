const { Client, GatewayIntentBits, ChannelType, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('HAPUS TOTAL MODE');
}).listen(PORT, () => console.log(`[WEB] Listening`));

const token = process.env.DISCORD_TOKEN.trim();
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
});

const commands = [
  new SlashCommandBuilder().setName('hapus-semua-total').setDescription('HAPUS SEMUA CHANNEL & KATEGORI TANPA SISA 1 PUN!'),
].map(c=>c.toJSON());

async function register() {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('[SLASH] hapus-semua-total registered');
}

client.once('ready', async () => {
  console.log(`BOT ${client.user.tag} SIAP HAPUS TOTAL`);
  await register();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'hapus-semua-total') return;

  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({ content: 'Hanya admin!', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  
  const guild = interaction.guild;
  await guild.channels.fetch();
  
  let total = guild.channels.cache.size;
  console.log(`[HAPUS TOTAL] Mulai hapus ${total} channel/kategori di ${guild.name}`);

  // Simpan ID channel tempat command dijalankan, hapus paling akhir
  const keepId = interaction.channelId;

  // Hapus semua channel dulu (bukan kategori)
  const channels = [...guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory).values()];
  for (const ch of channels) {
    if (ch.id === keepId) continue;
    try {
      console.log(`[HAPUS] ${ch.name}`);
      await ch.delete();
      await new Promise(r=>setTimeout(r, 300));
    } catch(e) {
      console.log(`Gagal hapus ${ch.name}: ${e.message}`);
    }
  }

  // Hapus semua kategori
  await guild.channels.fetch();
  const categories = [...guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).values()];
  for (const cat of categories) {
    try {
      console.log(`[HAPUS] Kategori ${cat.name}`);
      await cat.delete();
      await new Promise(r=>setTimeout(r, 300));
    } catch(e) {
      console.log(`Gagal hapus kategori ${cat.name}: ${e.message}`);
    }
  }

  await interaction.editReply(`💣 **HAPUS TOTAL SELESAI!** ${total} channel & kategori dihapus.\n\nSekarang server KOSONG TOTAL. Channel ini (${interaction.channel.name}) akan kehapus dalam 5 detik. Abis itu kamu harus bikin 1 channel manual di Discord: Klik kanan server > Create Channel > text > kasih nama general > baru deploy file bersih.`);

  // Hapus channel terakhir tempat command dijalankan
  setTimeout(async () => {
    try {
      const last = guild.channels.cache.get(keepId);
      if (last) {
        console.log(`[HAPUS] Channel terakhir: ${last.name}`);
        await last.delete();
      }
    } catch(e){}
  }, 5000);
});

client.login(token);
