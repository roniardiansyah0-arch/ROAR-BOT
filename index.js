const { Client, GatewayIntentBits, Events, Partials, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ROAR CREW FINAL FIX - ' + new Date().toISOString());
}).listen(PORT, () => console.log(`[WEB] Listening on ${PORT}`));

const token = (process.env.DISCORD_TOKEN || '').trim();
console.log('[CHECK] TOKEN exists:', !!token);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

const STRUCTURE = [
  { name: '│ START HERE', channels: [
    { name: '👋・welcome', type: ChannelType.GuildText },
    { name: '✅・take-role', type: ChannelType.GuildText },
    { name: '🔗・invite-link', type: ChannelType.GuildText },
    { name: '🚀・server-booster', type: ChannelType.GuildText },
  ]},
  { name: '│ GENERAL', channels: [
    { name: '💬・public-chat', type: ChannelType.GuildText },
    { name: '❓・qna-player', type: ChannelType.GuildText },
    { name: '🤖・bot-cmd', type: ChannelType.GuildText },
    { name: '📸・gallery', type: ChannelType.GuildText },
    { name: '💡・kritik-saran', type: ChannelType.GuildText },
  ]},
  { name: '│ GAME - JAVA KOPLO', channels: [
    { name: '✅・absen-harian', type: ChannelType.GuildText },
    { name: '⚔️・info-war', type: ChannelType.GuildText },
    { name: '📅・jadwal-event', type: ChannelType.GuildText },
    { name: '📨・jadwal-invitation', type: ChannelType.GuildText },
  ]},
  { name: '│ MEMBER STATS', channels: [
    { name: '📊・member-stats', type: ChannelType.GuildText },
    { name: '👥・Member: 0', type: ChannelType.GuildVoice },
  ]},
  { name: '│ VOICE & ENTERTAINMENT', channels: [
    { name: '🎙️・Ngobrol Santai', type: ChannelType.GuildVoice },
    { name: '⚔️・War Room', type: ChannelType.GuildVoice },
    { name: '🎤・Public Speaking', type: ChannelType.GuildVoice },
    { name: '🎥・live-n-content', type: ChannelType.GuildText },
    { name: '🎵・req-song', type: ChannelType.GuildText },
  ]},
  { name: '│ SUPPORT', channels: [
    { name: '🎫・ticket', type: ChannelType.GuildText },
    { name: '📝・logs', type: ChannelType.GuildText, privateAdmin: true },
  ]}
];

const commands = [
  new SlashCommandBuilder().setName('setup-roar').setDescription('Bikin struktur baru ROAR CREW (Admin only) - FINAL FIX'),
  new SlashCommandBuilder().setName('tiket-setup').setDescription('Kirim embed tiket (Admin)'),
  new SlashCommandBuilder().setName('absen').setDescription('Absen harian'),
  new SlashCommandBuilder().setName('list-member').setDescription('Lihat list member & stats'),
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  console.log('[SLASH] Registering FINAL FIX...');
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('[SLASH] Registered FINAL!');
}

async function ensureStructure(guild) {
  await guild.channels.fetch();
  console.log(`[SETUP] Mulai bikin struktur di ${guild.name}`);
  for (const catData of STRUCTURE) {
    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === catData.name);
    if (!category) {
      console.log(`[SETUP] Bikin kategori: ${catData.name}`);
      category = await guild.channels.create({ name: catData.name, type: ChannelType.GuildCategory });
      await new Promise(r=>setTimeout(r, 600));
    }
    for (const chData of catData.channels) {
      let existing = guild.channels.cache.find(c => c.name === chData.name && c.parentId === category.id);
      if (existing) {
        console.log(`[SETUP] Skip sudah ada: ${chData.name}`);
        continue;
      }
      console.log(`[SETUP] Bikin channel: ${chData.name} di ${catData.name}`);
      const perms = [];
      if (chData.privateAdmin) perms.push({ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] });
      try {
        await guild.channels.create({ name: chData.name, type: chData.type, parent: category.id, permissionOverwrites: perms });
      } catch(e) {
        console.log(`[SETUP] Gagal ${chData.name}: ${e.message} - coba lagi...`);
        await new Promise(r=>setTimeout(r, 1000));
        try { await guild.channels.create({ name: chData.name, type: chData.type, parent: category.id, permissionOverwrites: perms }); } catch(e2) {}
      }
      await new Promise(r=>setTimeout(r, 600));
    }
  }
  console.log('[SETUP] Selesai!');
}

async function sendTicketEmbed(guild) {
  await guild.channels.fetch();
  const ticketChannel = guild.channels.cache.find(c => c.name === '🎫・ticket');
  if (!ticketChannel) {
    console.log('[TICKET] Channel ticket tidak ada!');
    return false;
  }
  const embed = new EmbedBuilder()
    .setTitle('🎫 ROAR CREW - TICKET SYSTEM')
    .setDescription('**Butuh bantuan atau request invitation?**\n\n🔹 **Request Invitation War** → Masuk ke `#📨・jadwal-invitation`\n🔹 **Report / Bantuan** → Lapor scammer, bug, dll\n\nKlik tombol di bawah.')
    .setColor(0xFF9900)
    .setFooter({ text: 'ROAR CREW • Ticket nyambung ke Invitation' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('create_ticket_invitation').setLabel('📨 Request Invitation').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('create_ticket_report').setLabel('🚨 Report / Bantuan').setStyle(ButtonStyle.Secondary),
  );
  // Hapus embed lama biar ga dobel
  try {
    const msgs = await ticketChannel.messages.fetch({ limit: 10 });
    for (const m of msgs.values()) {
      if (m.author.id === client.user.id) await m.delete().catch(()=>{});
    }
  } catch(e){}
  await ticketChannel.send({ embeds: [embed], components: [row] });
  console.log('[TICKET] Embed dikirim!');
  return true;
}

client.once(Events.ClientReady, async () => {
  console.log(`🦁 ${client.user.tag} FINAL FIX ONLINE!`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-roar') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ Hanya admin!', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply('⏳ **Bikin struktur baru...** Sabar 20 detik ya, lagi bikin 6 kategori + 22 channel (ada delay biar ga error)');
        try {
          await ensureStructure(interaction.guild);
          await sendTicketEmbed(interaction.guild);
          return interaction.editReply('✅ **Struktur ROAR CREW berhasil dibikin!**\n\n6 kategori simple:\n- START HERE (4)\n- GENERAL (5)\n- GAME - JAVA KOPLO (4 - jadwal-event & invitation tetap 2)\n- MEMBER STATS (2)\n- VOICE & ENTERTAINMENT (5)\n- SUPPORT (ticket + logs)\n\nTicket embed udah auto kekirim di #🎫・ticket');
        } catch(e) {
          console.error(e);
          return interaction.editReply(`❌ Error pas setup: ${e.message}\nCoba lagi /setup-roar`);
        }
      }
      if (interaction.commandName === 'tiket-setup') {
        await interaction.deferReply({ ephemeral: true });
        const ok = await sendTicketEmbed(interaction.guild);
        if (!ok) return interaction.editReply('❌ Channel 🎫・ticket belum ada, /setup-roar dulu');
        return interaction.editReply('✅ Embed tiket dikirim di #🎫・ticket!');
      }
      if (interaction.commandName === 'absen') {
        const absenCh = interaction.guild.channels.cache.find(c => c.name === '✅・absen-harian');
        if (!absenCh) return interaction.reply({ content: 'Channel absen tidak ada, /setup-roar dulu', ephemeral: true });
        const embed = new EmbedBuilder().setTitle('✅ Absen Harian').setDescription(`${interaction.user} absen <t:${Math.floor(Date.now()/1000)}:F>`).setColor(0x00FF00).setThumbnail(interaction.user.displayAvatarURL());
        await absenCh.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Absen di ${absenCh}`, ephemeral: true });
      }
      if (interaction.commandName === 'list-member') {
        await interaction.deferReply();
        const guild = interaction.guild; await guild.members.fetch();
        const embed = new EmbedBuilder().setTitle('📊 MEMBER STATS - ROAR CREW').setDescription(`Total: **${guild.memberCount}**`).setColor(0x3498DB);
        return interaction.editReply({ embeds: [embed] });
      }
    }
    if (interaction.isButton() && interaction.customId.startsWith('create_ticket')) {
      const isInv = interaction.customId === 'create_ticket_invitation';
      if (isInv) {
        const modal = new ModalBuilder().setCustomId('modal_invitation').setTitle('Request Invitation');
        const j = new TextInputBuilder().setCustomId('judul').setLabel('Judul').setStyle(TextInputStyle.Short).setRequired(true);
        const t = new TextInputBuilder().setCustomId('tanggal').setLabel('Tanggal & Jam').setStyle(TextInputStyle.Short).setRequired(true);
        const tar = new TextInputBuilder().setCustomId('target').setLabel('Target').setStyle(TextInputStyle.Short).setRequired(true);
        const c = new TextInputBuilder().setCustomId('catatan').setLabel('Catatan').setStyle(TextInputStyle.Paragraph).setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(j), new ActionRowBuilder().addComponents(t), new ActionRowBuilder().addComponents(tar), new ActionRowBuilder().addComponents(c));
        return interaction.showModal(modal);
      } else {
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild;
        const category = guild.channels.cache.find(c => c.name === '│ SUPPORT' && c.type === ChannelType.GuildCategory);
        const channel = await guild.channels.create({
          name: `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g,'-').substring(0,30),
          type: ChannelType.GuildText, parent: category?.id,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
          ]
        });
        const embed = new EmbedBuilder().setTitle('🚨 Ticket Report').setDescription(`Halo ${interaction.user}`).setColor(0x95A5A6);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close').setStyle(ButtonStyle.Danger));
        await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
        return interaction.editReply({ content: `✅ Ticket: ${channel}` });
      }
    }
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      await interaction.reply({ content: 'Closing...' });
      setTimeout(()=>interaction.channel.delete().catch(()=>{}), 2000);
    }
    if (interaction.isModalSubmit() && interaction.customId === 'modal_invitation') {
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      const cat = guild.channels.cache.find(c => c.name === '│ SUPPORT' && c.type === ChannelType.GuildCategory);
      const ch = await guild.channels.create({
        name: `inv-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g,'-').substring(0,20),
        type: ChannelType.GuildText, parent: cat?.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
        ]
      });
      const embed = new EmbedBuilder().setTitle(`📨 ${interaction.fields.getTextInputValue('judul')}`).addFields(
        { name: 'Tanggal', value: interaction.fields.getTextInputValue('tanggal') },
        { name: 'Target', value: interaction.fields.getTextInputValue('target') },
        { name: 'Catatan', value: interaction.fields.getTextInputValue('catatan')||'-' },
        { name: 'By', value: `${interaction.user}` }
      ).setColor(0x3498DB);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger));
      await ch.send({ embeds: [embed], components: [row] });
      return interaction.editReply({ content: `✅ Ticket: ${ch}` });
    }
  } catch (err) {
    console.error('[ERROR]', err);
  }
});

client.login(token);
