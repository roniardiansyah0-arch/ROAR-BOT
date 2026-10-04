const { Client, GatewayIntentBits, Events, Partials, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ROAR CREW BOT - CLEAN - ' + new Date().toISOString());
}).listen(PORT, () => console.log(`[WEB] Listening on ${PORT}`));

const token = (process.env.DISCORD_TOKEN || '').trim();
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
  new SlashCommandBuilder().setName('setup-roar').setDescription('Bikin struktur baru ROAR CREW (Admin only)'),
  new SlashCommandBuilder().setName('absen').setDescription('Absen harian'),
  new SlashCommandBuilder().setName('list-member').setDescription('Lihat list member & stats'),
  new SlashCommandBuilder().setName('tiket-setup').setDescription('Kirim embed tiket (Admin)'),
  new SlashCommandBuilder().setName('jadwal-event').setDescription('Post jadwal event baru')
    .addStringOption(o => o.setName('judul').setDescription('Judul').setRequired(true))
    .addStringOption(o => o.setName('tanggal').setDescription('Tanggal').setRequired(true))
    .addStringOption(o => o.setName('deskripsi').setDescription('Deskripsi').setRequired(false)),
  new SlashCommandBuilder().setName('jadwal-invitation').setDescription('Post jadwal invitation (Admin)')
    .addStringOption(o => o.setName('judul').setDescription('Judul').setRequired(true))
    .addStringOption(o => o.setName('tanggal').setDescription('Tanggal & Jam').setRequired(true))
    .addStringOption(o => o.setName('target').setDescription('Target clan').setRequired(true))
    .addStringOption(o => o.setName('catatan').setDescription('Catatan').setRequired(false)),
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  console.log('[SLASH] Registering...');
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('[SLASH] Registered!');
}

async function ensureStructure(guild) {
  for (const catData of STRUCTURE) {
    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === catData.name);
    if (!category) category = await guild.channels.create({ name: catData.name, type: ChannelType.GuildCategory });
    for (const chData of catData.channels) {
      let existing = guild.channels.cache.find(c => c.name === chData.name && c.parentId === category.id);
      if (existing) continue;
      const perms = [];
      if (chData.privateAdmin) perms.push({ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] });
      await guild.channels.create({ name: chData.name, type: chData.type, parent: category.id, permissionOverwrites: perms });
    }
  }
}

async function updateMemberStats(guild) {
  try {
    const memberCount = guild.memberCount;
    const statsVoice = guild.channels.cache.find(c => c.name.startsWith('👥・Member:'));
    if (statsVoice && statsVoice.type === ChannelType.GuildVoice) {
      if (statsVoice.name !== `👥・Member: ${memberCount}`) await statsVoice.setName(`👥・Member: ${memberCount}`).catch(()=>{});
    }
  } catch(e){}
}

async function sendTicketEmbed(guild) {
  const ticketChannel = guild.channels.cache.find(c => c.name === '🎫・ticket');
  if (!ticketChannel) return;
  const embed = new EmbedBuilder()
    .setTitle('🎫 ROAR CREW - TICKET SYSTEM')
    .setDescription('**Butuh bantuan atau mau request invitation?**\n\n🔹 **Request Invitation War** → Nyambung ke `#📨・jadwal-invitation`\n🔹 **Report / Bantuan** → Lapor scammer, bug, dll\n\nKlik tombol di bawah.')
    .setColor(0xFF9900)
    .setFooter({ text: 'ROAR CREW • Ticket nyambung ke Invitation' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('create_ticket_invitation').setLabel('📨 Request Invitation').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('create_ticket_report').setLabel('🚨 Report / Bantuan').setStyle(ButtonStyle.Secondary),
  );
  const messages = await ticketChannel.messages.fetch({ limit: 10 }).catch(()=>null);
  if (messages) { const botMsgs = messages.filter(m => m.author.id === client.user.id); for (const m of botMsgs.values()) await m.delete().catch(()=>{}); }
  await ticketChannel.send({ embeds: [embed], components: [row] });
}

client.once(Events.ClientReady, async () => {
  console.log(`🦁 ${client.user.tag} CLEAN MODE ONLINE!`);
  await registerCommands();
  for (const guild of client.guilds.cache.values()) updateMemberStats(guild);
});

client.on(Events.GuildMemberAdd, (member) => {
  updateMemberStats(member.guild);
  const welcome = member.guild.channels.cache.find(c => c.name === '👋・welcome');
  if (welcome) welcome.send(`Selamat datang ${member} di **ROAR CREW**!`).catch(()=>{});
});
client.on(Events.GuildMemberRemove, (member) => { updateMemberStats(member.guild); });

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-roar') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ Hanya admin!', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        await ensureStructure(interaction.guild);
        await sendTicketEmbed(interaction.guild);
        return interaction.editReply('✅ Struktur ROAR CREW berhasil dibikin! 6 kategori simple, jadwal-event & invitation tetap 2.');
      }
      if (interaction.commandName === 'tiket-setup') {
        await sendTicketEmbed(interaction.guild);
        return interaction.reply({ content: '✅ Embed tiket dikirim!', ephemeral: true });
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
        const total = guild.memberCount;
        const embed = new EmbedBuilder().setTitle('📊 MEMBER STATS - ROAR CREW').setDescription(`Total: **${total}**`).setColor(0x3498DB);
        return interaction.editReply({ embeds: [embed] });
      }
      if (interaction.commandName === 'jadwal-event') {
        const ch = interaction.guild.channels.cache.find(c => c.name === '📅・jadwal-event');
        const embed = new EmbedBuilder().setTitle(`📅 ${interaction.options.getString('judul')}`).addFields(
          { name: '📆 Tanggal', value: interaction.options.getString('tanggal'), inline: true },
          { name: '📝 Deskripsi', value: interaction.options.getString('deskripsi')||'-' }
        ).setColor(0xF1C40F).setTimestamp();
        await ch.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Event di ${ch}`, ephemeral: true });
      }
      if (interaction.commandName === 'jadwal-invitation') {
        const ch = interaction.guild.channels.cache.find(c => c.name === '📨・jadwal-invitation');
        const embed = new EmbedBuilder().setTitle(`📨 INVITATION: ${interaction.options.getString('judul')}`).addFields(
          { name: '📆 Tanggal/Jam', value: interaction.options.getString('tanggal'), inline: true },
          { name: '🎯 Target', value: interaction.options.getString('target'), inline: true },
          { name: '📝 Catatan', value: interaction.options.getString('catatan')||'-' },
        ).setColor(0xE74C3C).setTimestamp();
        await ch.send({ content: '@everyone', embeds: [embed] });
        return interaction.reply({ content: `✅ Invitation di ${ch}`, ephemeral: true });
      }
    }
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('create_ticket')) {
        const isInvitation = interaction.customId === 'create_ticket_invitation';
        if (isInvitation) {
          const modal = new ModalBuilder().setCustomId('modal_invitation').setTitle('Diundang Clan Lain - ROAR CREW');
          const j = new TextInputBuilder().setCustomId('judul').setLabel('Judul Event/War').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Contoh: War Persahabatan');
          const t = new TextInputBuilder().setCustomId('tanggal').setLabel('Tanggal & Jam Invitation').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('10 Okt 2026 jam 20:00 WIB');
          const tar = new TextInputBuilder().setCustomId('target').setLabel('Clan Pengundang (Yang Undang Kita)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Contoh: KOPLO SQUAD');
          const c = new TextInputBuilder().setCustomId('catatan').setLabel('Link Grup / Catatan').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('Link WA/Discord clan pengundang, rules, dll');
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
          const embed = new EmbedBuilder().setTitle('🚨 Ticket Report').setDescription(`Halo ${interaction.user}, jelaskan masalahmu`).setColor(0x95A5A6);
          const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close').setStyle(ButtonStyle.Danger));
          await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
          return interaction.editReply({ content: `✅ Ticket: ${channel}` });
        }
      }
      if (interaction.customId === 'approve_invitation') {
        const invitationCh = interaction.guild.channels.cache.find(c => c.name === '📨・jadwal-invitation');
        if (!invitationCh) return interaction.reply({ content: '❌ Channel 📨・jadwal-invitation tidak ada!', ephemeral: true });
        const messages = await interaction.channel.messages.fetch({ limit: 20 });
        // FIX: cari embed yang judulnya mengandung "Diundang" (judul baru) bukan "Request Invitation" (judul lama)
        const botEmbedMsg = messages.find(m => m.embeds.length > 0 && (m.embeds[0].title?.includes('Diundang') || m.embeds[0].title?.includes('INVITATION') || m.embeds[0].title?.includes('Request')));
        if (!botEmbedMsg) return interaction.reply({ content: 'Data tidak ditemukan - embed hilang', ephemeral: true });
        const forwardEmbed = EmbedBuilder.from(botEmbedMsg.embeds[0]).setColor(0xE74C3C).setFooter({ text: `Approved by ${interaction.user.tag} • Clan Pengundang: ${botEmbedMsg.embeds[0].fields?.find(f=>f.name.includes('Diundang'))?.value||'-'}` });
        await invitationCh.send({ content: '@everyone 📨 **INVITATION DARI CLAN LAIN - DI-APPROVE**', embeds: [forwardEmbed] });
        await interaction.reply({ content: `✅ Di-post ke ${invitationCh}! Channel ini akan kehapus 5 detik.` });
        setTimeout(()=>interaction.channel.delete().catch(()=>{}), 5000);
      }
      if (interaction.customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Closing...' });
        setTimeout(()=>interaction.channel.delete().catch(()=>{}), 3000);
      }
    }
    if (interaction.isModalSubmit() && interaction.customId === 'modal_invitation') {
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      const category = guild.channels.cache.find(c => c.name === '│ SUPPORT' && c.type === ChannelType.GuildCategory);
      const judul = interaction.fields.getTextInputValue('judul');
      const tanggal = interaction.fields.getTextInputValue('tanggal');
      const target = interaction.fields.getTextInputValue('target');
      const catatan = interaction.fields.getTextInputValue('catatan')||'-';
      const channel = await guild.channels.create({
        name: `inv-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g,'-').substring(0,30),
        type: ChannelType.GuildText, parent: category?.id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
        ]
      });
      const embed = new EmbedBuilder().setTitle(`📨 Diundang: ${judul}`).addFields(
        { name: '📆 Tanggal Invitation', value: tanggal, inline: true },
        { name: '📩 Diundang Oleh (Clan Pengundang)', value: target, inline: true },
        { name: '📝 Link / Catatan', value: catatan },
        { name: '👤 Dilapor oleh', value: `${interaction.user}` }
      ).setColor(0x3498DB).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('approve_invitation').setLabel('✅ Approve & Post').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Tolak').setStyle(ButtonStyle.Danger),
      );
      await channel.send({ embeds: [embed], components: [row] });
      return interaction.editReply({ content: `✅ Request di ${channel}` });
    }
  } catch (err) {
    console.error('[ERROR]', err);
  }
});

client.login(token);
