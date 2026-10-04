const { Client, GatewayIntentBits, Events, Partials, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ROAR CREW BOT - ONLINE - ' + new Date().toISOString());
}).listen(PORT, () => console.log(`[WEB] Listening on ${PORT}`));

const token = (process.env.DISCORD_TOKEN || '').trim();
if (!token) {
  console.error('[FATAL] DISCORD_TOKEN tidak ada di .env');
  process.exit(1);
}
console.log('[CHECK] TOKEN exists:', !!token, '| length:', token.length);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

const STRUCTURE = [
  {
    name: '│ START HERE',
    channels: [
      { name: '👋・welcome', type: ChannelType.GuildText },
      { name: '✅・take-role', type: ChannelType.GuildText },
      { name: '🔗・invite-link', type: ChannelType.GuildText },
      { name: '🚀・server-booster', type: ChannelType.GuildText },
    ]
  },
  {
    name: '│ GENERAL',
    channels: [
      { name: '💬・public-chat', type: ChannelType.GuildText },
      { name: '❓・qna-player', type: ChannelType.GuildText },
      { name: '🤖・bot-cmd', type: ChannelType.GuildText },
      { name: '📸・gallery', type: ChannelType.GuildText },
      { name: '💡・kritik-saran', type: ChannelType.GuildText },
    ]
  },
  {
    name: '│ GAME - JAVA KOPLO',
    channels: [
      { name: '✅・absen-harian', type: ChannelType.GuildText },
      { name: '⚔️・info-war', type: ChannelType.GuildText },
      { name: '📅・jadwal-event', type: ChannelType.GuildText },
      { name: '📨・jadwal-invitation', type: ChannelType.GuildText },
    ]
  },
  {
    name: '│ MEMBER STATS',
    channels: [
      { name: '📊・member-stats', type: ChannelType.GuildText },
      { name: '👥・Member: 0', type: ChannelType.GuildVoice },
    ]
  },
  {
    name: '│ VOICE & ENTERTAINMENT',
    channels: [
      { name: '🎙️・Ngobrol Santai', type: ChannelType.GuildVoice },
      { name: '⚔️・War Room', type: ChannelType.GuildVoice },
      { name: '🎤・Public Speaking', type: ChannelType.GuildVoice },
      { name: '🎥・live-n-content', type: ChannelType.GuildText },
      { name: '🎵・req-song', type: ChannelType.GuildText },
    ]
  },
  {
    name: '│ SUPPORT',
    channels: [
      { name: '🎫・ticket', type: ChannelType.GuildText },
      { name: '📝・logs', type: ChannelType.GuildText, privateAdmin: true },
    ]
  }
];

// === DAFTAR NAMA LAMA FIX ===


const commands = [
  new SlashCommandBuilder().setName('setup-roar').setDescription('Setup / rapihkan struktur channel ROAR CREW (Admin only)'),
  new SlashCommandBuilder().setName('clean-old').setDescription('HAPUS semua channel & kategori lama yang dobel (Admin only) - FIX DOBEL'),
  new SlashCommandBuilder().setName('absen').setDescription('Absen harian'),
  new SlashCommandBuilder().setName('list-member').setDescription('Lihat list member & stats'),
  new SlashCommandBuilder().setName('jadwal-event').setDescription('Post jadwal event baru')
    .addStringOption(o => o.setName('judul').setDescription('Judul event').setRequired(true))
    .addStringOption(o => o.setName('tanggal').setDescription('Tanggal ex: 10 Okt 2025 20:00').setRequired(true))
    .addStringOption(o => o.setName('deskripsi').setDescription('Deskripsi').setRequired(false)),
  new SlashCommandBuilder().setName('jadwal-invitation').setDescription('Post jadwal invitation baru (Admin)')
    .addStringOption(o => o.setName('judul').setDescription('Judul invitation').setRequired(true))
    .addStringOption(o => o.setName('tanggal').setDescription('Tanggal & Jam').setRequired(true))
    .addStringOption(o => o.setName('target').setDescription('Target clan / lawan').setRequired(true))
    .addStringOption(o => o.setName('catatan').setDescription('Catatan').setRequired(false)),
  new SlashCommandBuilder().setName('tiket-setup').setDescription('Kirim embed tiket di #ticket (Admin)'),
].map(c => c.toJSON());

async function registerCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(token);
    console.log('[SLASH] Registering commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('[SLASH] Commands registered!');
  } catch (e) {
    console.error('[SLASH] Failed:', e);
  }
}

async function ensureStructure(guild) {
  console.log(`[SETUP] Memulai setup untuk ${guild.name}`);
  for (const catData of STRUCTURE) {
    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === catData.name);
    if (!category) {
      category = await guild.channels.create({ name: catData.name, type: ChannelType.GuildCategory });
      console.log(`[SETUP] Category dibuat: ${catData.name}`);
    }
    for (const chData of catData.channels) {
      let existing = guild.channels.cache.find(c => c.name === chData.name && c.parentId === category.id);
      if (existing) continue;
      const perms = [];
      if (chData.privateAdmin) {
        perms.push({ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] });
      }
      await guild.channels.create({
        name: chData.name,
        type: chData.type,
        parent: category.id,
        permissionOverwrites: perms
      });
      console.log(`[SETUP] Channel dibuat: ${chData.name}`);
    }
  }
  console.log('[SETUP] Selesai!');
}


async function cleanOldStructure(guild) {
  let deleted = 0;
  const whitelistNames = STRUCTURE.flatMap(c => c.channels.map(ch => ch.name));
  const whitelistCats = STRUCTURE.map(c => c.name);
  console.log('[CLEAN] Mulai bersih-bersih dobel...');
  const normalize = (s) => s.toLowerCase().replace(/[\s\-_:]+/g, ' ').replace(/・|·/g, ' ').trim();

  for (const ch of guild.channels.cache.values()) {
    if (ch.type === ChannelType.GuildCategory) continue;
    if (ch.name.startsWith('ticket-') || ch.name.includes('ticket-') || ch.name.startsWith('inv-')) continue;
    if (whitelistNames.includes(ch.name)) continue;
    const norm = normalize(ch.name);
    const OLD_BASE = [
      'absen harian','info war','jadwal event','jadwal invitation',
      'public chat','qna player','bot cmd','gallery','kritik saran',
      'share content','on streaming','streamer register','req song','req dance',
      'report player','scammer report','bug report','flavibot',
      'member stats','cek member','list member','welcome','join leave','log join',
      'take role','invite link','server booster',
      'ngobrol santai','war room','afk','public speaking','general'
    ];
    const shouldDelete = OLD_BASE.some(base => norm.includes(base));
    if (shouldDelete) {
      console.log('[CLEAN] Hapus channel lama: ' + ch.name);
      await ch.delete().catch(()=>{});
      deleted++;
    }
  }

  for (const cat of guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).values()) {
    if (whitelistCats.includes(cat.name)) continue;
    const childs = guild.channels.cache.filter(c => c.parentId === cat.id);
    for (const child of childs.values()) {
      if (!whitelistNames.includes(child.name) && !child.name.includes('ticket-') && !child.name.includes('inv-')) {
        console.log('[CLEAN] Hapus child di kategori lama ' + cat.name + ': ' + child.name);
        await child.delete().catch(()=>{});
        deleted++;
      }
    }
    const stillHasChild = guild.channels.cache.some(c => c.parentId === cat.id);
    if (!stillHasChild) {
      console.log('[CLEAN] Hapus kategori lama: ' + cat.name);
      await cat.delete().catch(()=>{});
      deleted++;
    }
  }
  return deleted;
}


async function updateMemberStats(guild) {
  try {
    const memberCount = guild.memberCount;
    const statsVoice = guild.channels.cache.find(c => c.name.startsWith('👥・Member:'));
    if (statsVoice && statsVoice.type === 2) { // GuildVoice = 2
      if (statsVoice.name !== `👥・Member: ${memberCount}`) {
        await statsVoice.setName(`👥・Member: ${memberCount}`).catch(()=>{});
      }
    }
  } catch(e) { console.error('[STATS]', e.message) }
}

async function sendTicketEmbed(guild) {
  const ticketChannel = guild.channels.cache.find(c => c.name === '🎫・ticket');
  if (!ticketChannel) return;
  const embed = new EmbedBuilder()
    .setTitle('🎫 ROAR CREW - TICKET SYSTEM')
    .setDescription(
      '**Butuh bantuan atau mau request invitation?**\n\n' +
      '🔹 **Request Invitation War** → Akan nyambung ke `#📨・jadwal-invitation` setelah di-approve admin\n' +
      '🔹 **Report / Bantuan** → Lapor scammer, bug, atau player\n\n' +
      'Klik tombol di bawah, isi form, ticket private akan dibuat otomatis.'
    )
    .setColor(0xFF9900)
    .setFooter({ text: 'ROAR CREW • Ticket nyambung ke Invitation' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('create_ticket_invitation').setLabel('📨 Request Invitation').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('create_ticket_report').setLabel('🚨 Report / Bantuan').setStyle(ButtonStyle.Secondary),
  );
  const messages = await ticketChannel.messages.fetch({ limit: 10 }).catch(() => null);
  if (messages) {
    const botMsgs = messages.filter(m => m.author.id === client.user.id);
    for (const m of botMsgs.values()) await m.delete().catch(() => {});
  }
  await ticketChannel.send({ embeds: [embed], components: [row] });
  console.log('[TICKET] Embed ticket terkirim');
}

client.once(Events.ClientReady, async () => {
  console.log(`🦁 ${client.user.tag} ONLINE - SUCCESS!`);
  await registerCommands();
  for (const guild of client.guilds.cache.values()) {
    updateMemberStats(guild);
  }
});

client.on(Events.GuildMemberAdd, (member) => {
  updateMemberStats(member.guild);
  const welcome = member.guild.channels.cache.find(c => c.name === '👋・welcome');
  if (welcome) welcome.send(`Selamat datang ${member} di **ROAR CREW**! Jangan lupa ambil role di <#${member.guild.channels.cache.find(c => c.name.includes('take-role'))?.id}>`).catch(() => {});
});

client.on(Events.GuildMemberRemove, (member) => {
  updateMemberStats(member.guild);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'setup-roar') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: '❌ Hanya admin!', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        await ensureStructure(interaction.guild);
        await sendTicketEmbed(interaction.guild);
        return interaction.editReply('✅ Struktur ROAR CREW berhasil dirapihkan! Cek kategori baru. Kalau dobel, pakai /clean-old');
      }

      if (commandName === 'clean-old') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: '❌ Hanya admin!', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        const deleted = await cleanOldStructure(interaction.guild);
        return interaction.editReply(`🧹 Beres! ${deleted} channel & kategori lama yang dobel sudah dihapus. Sekarang udah bersih simple.`);
      }

      if (commandName === 'tiket-setup') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: '❌ Hanya admin!', ephemeral: true });
        }
        await sendTicketEmbed(interaction.guild);
        return interaction.reply({ content: '✅ Embed tiket dikirim!', ephemeral: true });
      }

      if (commandName === 'absen') {
        const absenCh = interaction.guild.channels.cache.find(c => c.name === '✅・absen-harian');
        if (!absenCh) return interaction.reply({ content: 'Channel absen tidak ditemukan, jalankan /setup-roar', ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('✅ Absen Harian')
          .setDescription(`${interaction.user} telah absen pada <t:${Math.floor(Date.now() / 1000)}:F>`)
          .setColor(0x00FF00)
          .setThumbnail(interaction.user.displayAvatarURL());
        await absenCh.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Absen berhasil dicatat di ${absenCh}`, ephemeral: true });
      }

      if (commandName === 'list-member') {
        await interaction.deferReply();
        const guild = interaction.guild;
        await guild.members.fetch();
        const total = guild.memberCount;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = total - bots;
        const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
        const embed = new EmbedBuilder()
          .setTitle('📊 MEMBER STATS - ROAR CREW')
          .setDescription(`Total: **${total}** | Member: **${humans}** | Bot: **${bots}** | Online: **${online}**`)
          .setColor(0x3498DB)
          .addFields(
            { name: '👑 Admin', value: guild.members.cache.filter(m => m.permissions.has(PermissionsBitField.Flags.Administrator)).map(m => m.user.tag).slice(0, 10).join('\n') || '-', inline: true },
            { name: '📅 Dibuat', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
          );
        return interaction.editReply({ embeds: [embed] });
      }

      if (commandName === 'jadwal-event') {
        const ch = interaction.guild.channels.cache.find(c => c.name === '📅・jadwal-event');
        if (!ch) return interaction.reply({ content: 'Channel jadwal-event tidak ada', ephemeral: true });
        const judul = interaction.options.getString('judul');
        const tanggal = interaction.options.getString('tanggal');
        const deskripsi = interaction.options.getString('deskripsi') || '-';
        const embed = new EmbedBuilder()
          .setTitle(`📅 ${judul}`)
          .addFields(
            { name: '📆 Tanggal', value: tanggal, inline: true },
            { name: '👤 Oleh', value: `${interaction.user}`, inline: true },
            { name: '📝 Deskripsi', value: deskripsi }
          )
          .setColor(0xF1C40F)
          .setTimestamp();
        await ch.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Event dipost di ${ch}`, ephemeral: true });
      }

      if (commandName === 'jadwal-invitation') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
          return interaction.reply({ content: '❌ Hanya admin/mod bisa post invitation langsung. Member pakai ticket.', ephemeral: true });
        }
        const ch = interaction.guild.channels.cache.find(c => c.name === '📨・jadwal-invitation');
        if (!ch) return interaction.reply({ content: 'Channel jadwal-invitation tidak ada', ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle(`📨 INVITATION: ${interaction.options.getString('judul')}`)
          .addFields(
            { name: '📆 Tanggal/Jam', value: interaction.options.getString('tanggal'), inline: true },
            { name: '🎯 Target', value: interaction.options.getString('target'), inline: true },
            { name: '📝 Catatan', value: interaction.options.getString('catatan') || '-' },
            { name: '👤 Request by', value: `${interaction.user}` }
          )
          .setColor(0xE74C3C)
          .setTimestamp();
        await ch.send({ content: '@everyone', embeds: [embed] });
        return interaction.reply({ content: `✅ Invitation dipost di ${ch}`, ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'create_ticket_invitation' || interaction.customId === 'create_ticket_report') {
        const isInvitation = interaction.customId === 'create_ticket_invitation';
        if (isInvitation) {
          const modal = new ModalBuilder().setCustomId('modal_invitation').setTitle('Request Jadwal Invitation');
          const judulInput = new TextInputBuilder().setCustomId('judul').setLabel('Judul Invitation / War').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: War vs ROAR ELITE');
          const tanggalInput = new TextInputBuilder().setCustomId('tanggal').setLabel('Tanggal & Jam').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 12 Okt 2025 21:00 WIB');
          const targetInput = new TextInputBuilder().setCustomId('target').setLabel('Target Clan / Lawan').setStyle(TextInputStyle.Short).setRequired(true);
          const catatanInput = new TextInputBuilder().setCustomId('catatan').setLabel('Catatan / Strategi').setStyle(TextInputStyle.Paragraph).setRequired(false);
          modal.addComponents(
            new ActionRowBuilder().addComponents(judulInput),
            new ActionRowBuilder().addComponents(tanggalInput),
            new ActionRowBuilder().addComponents(targetInput),
            new ActionRowBuilder().addComponents(catatanInput),
          );
          return interaction.showModal(modal);
        } else {
          await interaction.deferReply({ ephemeral: true });
          const guild = interaction.guild;
          const category = guild.channels.cache.find(c => c.name === '│ SUPPORT' && c.type === ChannelType.GuildCategory);
          const channel = await guild.channels.create({
            name: `🎫・ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 30),
            type: ChannelType.GuildText,
            parent: category?.id,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
              { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
            ]
          });
          const embed = new EmbedBuilder().setTitle('🚨 Ticket Report / Bantuan').setDescription(`Halo ${interaction.user}, jelaskan masalah kamu di channel ini. Admin akan segera merespon.`).setColor(0x95A5A6);
          const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger));
          await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
          return interaction.editReply({ content: `✅ Ticket dibuat: ${channel}` });
        }
      }
      if (interaction.customId === 'approve_invitation') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
          return interaction.reply({ content: '❌ Hanya admin bisa approve', ephemeral: true });
        }
        const messages = await interaction.channel.messages.fetch({ limit: 20 });
        const botEmbedMsg = messages.find(m => m.embeds.length > 0 && m.embeds[0].title?.includes('Request Invitation'));
        if (!botEmbedMsg) return interaction.reply({ content: 'Data invitation tidak ditemukan', ephemeral: true });
        const embedData = botEmbedMsg.embeds[0];
        const invitationCh = interaction.guild.channels.cache.find(c => c.name === '📨・jadwal-invitation');
        if (!invitationCh) return interaction.reply({ content: 'Channel jadwal-invitation tidak ada', ephemeral: true });
        const forwardEmbed = EmbedBuilder.from(embedData).setColor(0xE74C3C).setFooter({ text: `Approved by ${interaction.user.tag}` });
        await invitationCh.send({ content: '@everyone 📨 **INVITATION BARU DI-APPROVE**', embeds: [forwardEmbed] });
        await interaction.reply({ content: `✅ Di-approve & dipost ke ${invitationCh}!` });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }
      if (interaction.customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Ticket akan ditutup dalam 3 detik...' });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_invitation') {
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      const category = guild.channels.cache.find(c => c.name === '│ SUPPORT' && c.type === ChannelType.GuildCategory);
      const judul = interaction.fields.getTextInputValue('judul');
      const tanggal = interaction.fields.getTextInputValue('tanggal');
      const target = interaction.fields.getTextInputValue('target');
      const catatan = interaction.fields.getTextInputValue('catatan') || '-';
      const channel = await guild.channels.create({
        name: `📨・inv-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 30),
        type: ChannelType.GuildText,
        parent: category?.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
        ]
      });
      const embed = new EmbedBuilder()
        .setTitle(`📨 Request Invitation: ${judul}`)
        .addFields(
          { name: '📆 Tanggal/Jam', value: tanggal, inline: true },
          { name: '🎯 Target', value: target, inline: true },
          { name: '📝 Catatan', value: catatan },
          { name: '👤 Request by', value: `${interaction.user} (${interaction.user.id})` }
        )
        .setColor(0x3498DB)
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('approve_invitation').setLabel('✅ Approve & Post ke Jadwal').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Tolak / Close').setStyle(ButtonStyle.Danger),
      );
      await channel.send({ content: `Ticket Invitation dari ${interaction.user} - Admin silahkan review`, embeds: [embed], components: [row] });
      return interaction.editReply({ content: `✅ Request kamu dibuat di ${channel}. Tunggu admin approve, nanti otomatis masuk ke #📨・jadwal-invitation` });
    }

  } catch (err) {
    console.error('[INTERACTION ERROR]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error: ' + err.message, ephemeral: true }).catch(() => {});
    }
  }
});

async function testToken() {
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bot ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (res.status === 200) console.log(`[TEST] TOKEN VALID! Bot: ${data.username} ID:${data.id}`);
    else console.error(`[TEST] TOKEN ERROR ${res.status}`, data);
  } catch (e) {
    console.error('[TEST] Fetch error', e.message);
  }
}

testToken().then(() => {
  client.login(token)
    .then(() => console.log('[LOGIN] login() OK'))
    .catch(e => console.error('[LOGIN] Failed:', e.message));
});

process.on('unhandledRejection', e => console.error('[UNHANDLED]', e));
process.on('uncaughtException', e => console.error('[UNCAUGHT]', e));
