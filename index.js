const { Client, GatewayIntentBits, Events, Partials, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ROAR CREW - BARTER SYSTEM - ' + new Date().toISOString());
}).listen(PORT, () => console.log(`[WEB] Listening on ${PORT}`));

const token = (process.env.DISCORD_TOKEN || '').trim();
console.log('[CHECK] TOKEN exists:', !!token);

// ===== DATA PERSISTENCE =====
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const INV_FILE = path.join(DATA_DIR, 'invitations.json');
const BOARD_FILE = path.join(DATA_DIR, 'board_message.json');

function loadInvitations() {
  try {
    if (!fs.existsSync(INV_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(INV_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function saveInvitations(list) {
  try { fs.writeFileSync(INV_FILE, JSON.stringify(list, null, 2)); } catch(e){ console.error('save fail', e); }
}
function loadBoardInfo() {
  try {
    if (!fs.existsSync(BOARD_FILE)) return null;
    return JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8'));
  } catch { return null; }
}
function saveBoardInfo(info) {
  try { fs.writeFileSync(BOARD_FILE, JSON.stringify(info, null, 2)); } catch {}
}

// ===== DATE HELPER =====
const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function parseTanggalInput(tglStr) {
  // Contoh input: "05 OKTOBER 2026 20:00 WIB" atau "05 Oktober 2026" atau "04 Oktober 2026 (0/3)" etc
  // Ambil jam dengan regex
  const jamMatch = tglStr.match(/(\d{1,2}:\d{2})(\s*WIB)?/i);
  const jam = jamMatch ? jamMatch[0].toUpperCase() : '00:00 WIB';
  
  // Ambil tanggal: cari angka tanggal, bulan, tahun
  const dateRegex = /(\d{1,2})\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\w*\s*(\d{4})/i;
  const m = tglStr.match(dateRegex);
  let day, monthIdx, year, dateObj;
  if (m) {
    day = parseInt(m[1]);
    const bulanRaw = m[2].toLowerCase();
    // map
    const map = { januari:0, februari:1, maret:2, april:3, mei:4, juni:5, juli:6, agustus:7, september:8, oktober:9, november:10, desember:11, jan:0, feb:1, mar:2, apr:3, jun:5, jul:6, agu:7, sep:8, okt:9, nov:10, des:11 };
    monthIdx = map[bulanRaw.substring(0,3)] ?? map[bulanRaw] ?? 9;
    year = parseInt(m[3]);
    dateObj = new Date(year, monthIdx, day);
  } else {
    // fallback hari ini
    dateObj = new Date();
    day = dateObj.getDate();
    monthIdx = dateObj.getMonth();
    year = dateObj.getFullYear();
  }
  
  const dateKey = `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const dateDisplay = `${String(day).padStart(2,'0')} ${BULAN_ID[monthIdx]} ${year}`;
  
  return { jam, dateKey, dateDisplay, day, monthIdx, year, dateObj, raw: tglStr };
}

function getNextDays(n=7) {
  const days = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  for (let i=0; i<n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate()+i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const display = `${String(d.getDate()).padStart(2,'0')} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
    days.push({ dateObj: d, dateKey: key, dateDisplay: display });
  }
  return days;
}

async function updateInvitationBoard(guild) {
  try {
    const invitations = loadInvitations();
    const invitationCh = guild.channels.cache.find(c => c.name === '📨・jadwal-invitation');
    if (!invitationCh) return;

    // Group by dateKey
    const grouped = {};
    invitations.forEach(inv => {
      if (!grouped[inv.dateKey]) grouped[inv.dateKey] = [];
      grouped[inv.dateKey].push(inv);
    });

    // Build next 7 days + any future dates that have invitations
    let days = getNextDays(7);
    // Add extra dates from invitations that are beyond 7 days and future
    const extraKeys = Object.keys(grouped).filter(k => !days.some(d=>d.dateKey===k)).sort();
    extraKeys.forEach(k => {
      const sample = grouped[k][0];
      days.push({ dateKey: k, dateDisplay: sample.dateDisplay, dateObj: new Date(sample.year, sample.monthIdx, sample.day) });
    });
    days.sort((a,b)=> a.dateObj - b.dateObj);

    // Build description like user example
    let desc = `**📅 JADWAL INVITATION - ROAR CREW**\n*Max 3 invitation per hari • Auto update dari ticket*\n\n`;
    for (const day of days) {
      const list = grouped[day.dateKey] || [];
      // sort by jam
      list.sort((a,b)=> a.jam.localeCompare(b.jam));
      const count = list.length;
      const max = 3;
      desc += `**📅 Tgl ${day.dateDisplay} (${count}/${max})**\n`;
      if (count===0) {
        desc += `-\n-\n-\n\n`;
      } else {
        for (let i=0; i<max; i++) {
          if (i < list.length) {
            const inv = list[i];
            desc += `${inv.jam} - ${inv.clan} (${inv.judul})\n`;
          } else {
            desc += `-\n`;
          }
        }
        desc += `\n`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('📅 JADWAL INVITATION - BOARD')
      .setDescription(desc)
      .setColor(0x00BFFF)
      .setFooter({ text: `Last update: ${new Date().toLocaleString('id-ID')} • Total invitation: ${invitations.length}` })
      .setTimestamp();

    // Cari board message yang sudah ada
    const boardInfo = loadBoardInfo();
    if (boardInfo && boardInfo.guildId===guild.id && boardInfo.channelId===invitationCh.id && boardInfo.messageId) {
      try {
        const msg = await invitationCh.messages.fetch(boardInfo.messageId);
        await msg.edit({ embeds: [embed] });
        console.log('[BOARD] Updated existing board');
        return;
      } catch(e) {
        console.log('[BOARD] Old board not found, creating new');
      }
    }

    // Cari pesan bot dengan title board
    try {
      const msgs = await invitationCh.messages.fetch({ limit: 20 });
      const existing = msgs.find(m => m.author.id===client.user.id && m.embeds[0]?.title?.includes('JADWAL INVITATION - BOARD'));
      if (existing) {
        await existing.edit({ embeds: [embed] });
        saveBoardInfo({ guildId: guild.id, channelId: invitationCh.id, messageId: existing.id });
        console.log('[BOARD] Edited found board');
        return;
      }
    } catch {}

    // Buat baru + pin
    const newMsg = await invitationCh.send({ embeds: [embed] });
    try { await newMsg.pin().catch(()=>{}); } catch {}
    saveBoardInfo({ guildId: guild.id, channelId: invitationCh.id, messageId: newMsg.id });
    console.log('[BOARD] Created new board');

  } catch(e) {
    console.error('[BOARD ERROR]', e);
  }
}

async function logToLogsChannel(guild, data) {
  try {
    const logsCh = guild.channels.cache.find(c => c.name === '📝・logs');
    if (!logsCh) return;
    
    const embed = new EmbedBuilder()
      .setTitle('📝 HISTORY INVITATION - BARTER TRACKING')
      .setDescription(`**Clan ${data.clan} pernah undang ROAR CREW**\nGunakan info ini untuk undang balik / barter support`)
      .addFields(
        { name: '📩 Clan Pengundang', value: `**${data.clan}**`, inline: true },
        { name: '📅 Tanggal', value: data.tanggalRaw, inline: true },
        { name: '⏰ Jam', value: data.jam, inline: true },
        { name: '🎯 Judul', value: data.judul, inline: false },
        { name: '👤 Dilapor oleh (Discord)', value: `${data.reporterTag} (<@${data.reporterId}>)\nUsername: ${data.reporterUsername}`, inline: true },
        { name: '✅ Di-approve oleh', value: `${data.approvedByTag}`, inline: true },
        { name: '📝 Link/Catatan', value: data.catatan || '-', inline: false },
        { name: '🔄 Status Barter', value: `❌ Belum undang balik\n*Gunakan data ini untuk tracking support*`, inline: false },
      )
      .setColor(0xFFD700)
      .setFooter({ text: `ID: ${data.id} • Barter System • ${new Date().toLocaleDateString('id-ID')}` })
      .setTimestamp();

    await logsCh.send({ embeds: [embed] });
    console.log('[LOGS] History logged');
  } catch(e) {
    console.error('[LOGS ERROR]', e);
  }
}

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
  new SlashCommandBuilder().setName('setup-roar').setDescription('Bikin struktur baru ROAR CREW (Admin only)'),
  new SlashCommandBuilder().setName('tiket-setup').setDescription('Kirim embed tiket (Admin)'),
  new SlashCommandBuilder().setName('absen').setDescription('Absen harian'),
  new SlashCommandBuilder().setName('list-member').setDescription('Lihat list member & stats'),
  new SlashCommandBuilder().setName('board-refresh').setDescription('Refresh board jadwal invitation (Admin)'),
  new SlashCommandBuilder().setName('history-clan').setDescription('Lihat history clan yang pernah undang')
    .addStringOption(o=>o.setName('clan').setDescription('Nama clan').setRequired(false)),
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  console.log('[SLASH] Registering BARTER SYSTEM...');
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('[SLASH] Registered BARTER!');
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
      if (existing) continue;
      const perms = [];
      if (chData.privateAdmin) perms.push({ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] });
      try {
        await guild.channels.create({ name: chData.name, type: chData.type, parent: category.id, permissionOverwrites: perms });
      } catch(e) {
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
  if (!ticketChannel) return false;
  const embed = new EmbedBuilder()
    .setTitle('🎫 ROAR CREW - TICKET INVITATION SYSTEM')
    .setDescription('**Dapat undangan dari clan lain? Lapor di sini!**\n\n🔹 **Request Invitation** → Clan lain undang kita, lapor biar masuk jadwal & ke-track di #logs buat barter balik\n🔹 **Report / Bantuan** → Lapor masalah\n\n*Semua invitation yang di-approve akan masuk board harian & history barter di #logs*')
    .setColor(0xFF9900)
    .setFooter({ text: 'ROAR CREW • Barter System • Tracking clan support' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('create_ticket_invitation').setLabel('📨 Lapor Diundang Clan Lain').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('create_ticket_report').setLabel('🚨 Report / Bantuan').setStyle(ButtonStyle.Secondary),
  );
  try {
    const msgs = await ticketChannel.messages.fetch({ limit: 10 });
    for (const m of msgs.values()) {
      if (m.author.id === client.user.id) await m.delete().catch(()=>{});
    }
  } catch(e){}
  await ticketChannel.send({ embeds: [embed], components: [row] });
  return true;
}

client.once(Events.ClientReady, async () => {
  console.log(`🦁 ${client.user.tag} BARTER SYSTEM ONLINE!`);
  await registerCommands();
  // Auto refresh board on startup
  for (const guild of client.guilds.cache.values()) {
    await guild.channels.fetch();
    await updateInvitationBoard(guild).catch(()=>{});
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-roar') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ Hanya admin!', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply('⏳ **Bikin struktur...** 20 detik ya');
        try {
          await ensureStructure(interaction.guild);
          await sendTicketEmbed(interaction.guild);
          await updateInvitationBoard(interaction.guild);
          return interaction.editReply('✅ **Struktur ROAR CREW + Barter System berhasil!**\n- 6 kategori\n- Board invitation auto\n- History logs buat barter');
        } catch(e) {
          return interaction.editReply(`❌ Error: ${e.message}`);
        }
      }
      if (interaction.commandName === 'tiket-setup') {
        await interaction.deferReply({ ephemeral: true });
        const ok = await sendTicketEmbed(interaction.guild);
        if (!ok) return interaction.editReply('❌ Channel 🎫・ticket belum ada');
        return interaction.editReply('✅ Embed tiket barter system dikirim!');
      }
      if (interaction.commandName === 'board-refresh') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ Hanya admin!', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        await updateInvitationBoard(interaction.guild);
        return interaction.editReply('✅ Board jadwal invitation di-refresh!');
      }
      if (interaction.commandName === 'history-clan') {
        await interaction.deferReply({ ephemeral: true });
        const invitations = loadInvitations();
        const clanFilter = interaction.options.getString('clan');
        let filtered = invitations;
        if (clanFilter) filtered = invitations.filter(i=>i.clan.toLowerCase().includes(clanFilter.toLowerCase()));
        if (filtered.length===0) return interaction.editReply(`❌ Tidak ada history untuk ${clanFilter||'clan'}`);
        
        // Group by clan
        const byClan = {};
        filtered.forEach(inv=>{
          if (!byClan[inv.clan]) byClan[inv.clan]=[];
          byClan[inv.clan].push(inv);
        });
        let desc = `**📝 HISTORY CLAN PENGUNDANG - BARTER TRACKING**\nTotal: ${filtered.length} invitation\n\n`;
        for (const [clan, list] of Object.entries(byClan)) {
          desc += `**${clan}** - ${list.length}x undang\n`;
          list.slice(-3).forEach(inv=>{
            desc += `└ ${inv.dateDisplay} ${inv.jam} oleh ${inv.reporterUsername}\n`;
          });
          desc += `\n`;
        }
        const embed = new EmbedBuilder().setTitle('📝 History Clan Barter').setDescription(desc).setColor(0xFFD700);
        return interaction.editReply({ embeds: [embed] });
      }
      if (interaction.commandName === 'absen') {
        const absenCh = interaction.guild.channels.cache.find(c => c.name === '✅・absen-harian');
        if (!absenCh) return interaction.reply({ content: 'Channel absen tidak ada', ephemeral: true });
        const embed = new EmbedBuilder().setTitle('✅ Absen Harian').setDescription(`${interaction.user} absen <t:${Math.floor(Date.now()/1000)}:F>`).setColor(0x00FF00).setThumbnail(interaction.user.displayAvatarURL());
        await absenCh.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Absen di ${absenCh}`, ephemeral: true });
      }
      if (interaction.commandName === 'list-member') {
        await interaction.deferReply();
        await interaction.guild.members.fetch();
        const embed = new EmbedBuilder().setTitle('📊 MEMBER STATS').setDescription(`Total: **${interaction.guild.memberCount}**`).setColor(0x3498DB);
        return interaction.editReply({ embeds: [embed] });
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith('create_ticket')) {
      const isInv = interaction.customId === 'create_ticket_invitation';
      if (isInv) {
        const modal = new ModalBuilder().setCustomId('modal_invitation').setTitle('Diundang Clan Lain - Lapor');
        const j = new TextInputBuilder().setCustomId('judul').setLabel('Judul Event/War').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Contoh: War Persahabatan vs...');
        const t = new TextInputBuilder().setCustomId('tanggal').setLabel('Tanggal & Jam (Contoh: 05 Okt 2026 20:00)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('05 Oktober 2026 20:00 WIB');
        const tar = new TextInputBuilder().setCustomId('target').setLabel('Clan Pengundang (Yang Undang Kita)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Contoh: CDM, LUNOVE VEXNIGHT');
        const c = new TextInputBuilder().setCustomId('catatan').setLabel('Link Grup / Catatan').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('Link WA/Discord clan pengundang');
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

    if (interaction.isButton() && interaction.customId === 'approve_invitation') {
      const invitationCh = interaction.guild.channels.cache.find(c => c.name === '📨・jadwal-invitation');
      const logsCh = interaction.guild.channels.cache.find(c => c.name === '📝・logs');
      if (!invitationCh) return interaction.reply({ content: '❌ Channel invitation tidak ada!', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });

      const messages = await interaction.channel.messages.fetch({ limit: 20 });
      const botEmbedMsg = messages.find(m => m.embeds.length > 0 && (m.embeds[0].title?.includes('Diundang') || m.embeds[0].title?.includes('INVITATION') || m.embeds[0].title?.includes('Request')));
      if (!botEmbedMsg) return interaction.editReply({ content: 'Data tidak ditemukan - embed hilang' });
      
      const emb = botEmbedMsg.embeds[0];
      const judul = emb.title.replace('📨 Diundang:','').trim() || 'INVITATION';
      const tanggalRaw = emb.fields.find(f=>f.name.includes('Tanggal'))?.value || '05 Oktober 2026';
      const clan = emb.fields.find(f=>f.name.includes('Diundang'))?.value || 'UNKNOWN';
      const catatan = emb.fields.find(f=>f.name.includes('Link')||f.name.includes('Catatan'))?.value || '-';
      const reporterMention = emb.fields.find(f=>f.name.includes('Dilapor'))?.value || '';
      // Extract reporter ID from mention
      const reporterIdMatch = reporterMention.match(/<@!?(\d+)>/);
      const reporterId = reporterIdMatch ? reporterIdMatch[1] : interaction.user.id;
      let reporterUser = null;
      try { reporterUser = await interaction.guild.members.fetch(reporterId); } catch {}
      const reporterTag = reporterUser ? reporterUser.user.tag : 'Unknown';
      const reporterUsername = reporterUser ? reporterUser.user.username : reporterMention.replace(/<@!?\d+>/g,'').trim() || 'Unknown';

      const parsed = parseTanggalInput(tanggalRaw);
      
      // Save to JSON
      const invitations = loadInvitations();
      const newInv = {
        id: Date.now().toString(),
        judul,
        tanggalRaw,
        dateKey: parsed.dateKey,
        dateDisplay: parsed.dateDisplay,
        day: parsed.day,
        monthIdx: parsed.monthIdx,
        year: parsed.year,
        jam: parsed.jam,
        clan,
        catatan,
        reporterId,
        reporterTag,
        reporterUsername,
        approvedByTag: interaction.user.tag,
        approvedById: interaction.user.id,
        timestamp: Date.now()
      };
      invitations.push(newInv);
      saveInvitations(invitations);

      // Post to invitation channel (detail)
      const forwardEmbed = EmbedBuilder.from(emb).setColor(0xE74C3C).setFooter({ text: `Approved by ${interaction.user.tag} • Clan: ${clan} • Masuk board & logs` });
      await invitationCh.send({ content: `@everyone 📨 **INVITATION DARI ${clan.toUpperCase()} - DI-APPROVE**`, embeds: [forwardEmbed] });

      // Log to logs channel for barter tracking
      await logToLogsChannel(interaction.guild, newInv);

      // Update board
      await updateInvitationBoard(interaction.guild);

      await interaction.editReply({ content: `✅ Di-post ke ${invitationCh} + ${logsCh} + board di-update! Channel ini kehapus 5 detik.` });
      setTimeout(()=>interaction.channel.delete().catch(()=>{}), 5000);
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      await interaction.reply({ content: '🔒 Closing...' });
      setTimeout(()=>interaction.channel.delete().catch(()=>{}), 2000);
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
      const parsed = parseTanggalInput(tanggal);
      const embed = new EmbedBuilder().setTitle(`📨 Diundang: ${judul}`).addFields(
        { name: '📆 Tanggal Invitation', value: tanggal, inline: true },
        { name: '📩 Diundang Oleh (Clan Pengundang)', value: target, inline: true },
        { name: '⏰ Jam Parsed', value: parsed.jam, inline: true },
        { name: '📝 Link / Catatan', value: catatan },
        { name: '👤 Dilapor oleh', value: `${interaction.user}` }
      ).setColor(0x3498DB).setTimestamp().setFooter({ text: `Akan masuk board: ${parsed.dateDisplay} • Barter tracking` });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('approve_invitation').setLabel('✅ Approve & Post ke Board').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Tolak').setStyle(ButtonStyle.Danger),
      );
      await channel.send({ embeds: [embed], components: [row] });
      return interaction.editReply({ content: `✅ Request di ${channel} - nanti masuk board harian & logs` });
    }
  } catch (err) {
    console.error('[ERROR]', err);
  }
});

client.login(token);
