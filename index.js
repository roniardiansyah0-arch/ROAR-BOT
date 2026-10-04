const { Client, GatewayIntentBits, Events, Partials, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ROAR CREW - STABLE - ' + new Date().toISOString());
}).listen(PORT, () => console.log(`[WEB] Listening on ${PORT}`));

const token = (process.env.DISCORD_TOKEN || '').trim();
console.log('[CHECK] TOKEN exists:', !!token);

// DATA
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const INV_FILE = path.join(DATA_DIR, 'invitations.json');
const BOARD_FILE = path.join(DATA_DIR, 'board_message.json');
const EVENT_FILE = path.join(DATA_DIR, 'events_out.json');
const EVENT_BOARD_FILE = path.join(DATA_DIR, 'event_board_message.json');

function loadInvitations(){ try{ if(!fs.existsSync(INV_FILE)) return []; const d=JSON.parse(fs.readFileSync(INV_FILE,'utf8')); return Array.isArray(d)?d:[]; }catch{ return []; } }
function saveInvitations(l){ try{ fs.writeFileSync(INV_FILE, JSON.stringify(l,null,2)); }catch(e){ console.error('save fail',e); } }
function loadEventsOut(){ try{ if(!fs.existsSync(EVENT_FILE)) return []; const d=JSON.parse(fs.readFileSync(EVENT_FILE,'utf8')); return Array.isArray(d)?d:[]; }catch{ return []; } }
function saveEventsOut(l){ try{ fs.writeFileSync(EVENT_FILE, JSON.stringify(l,null,2)); }catch(e){} }
function loadBoardInfo(){ try{ if(!fs.existsSync(BOARD_FILE)) return null; return JSON.parse(fs.readFileSync(BOARD_FILE,'utf8')); }catch{ return null; } }
function saveBoardInfo(i){ try{ fs.writeFileSync(BOARD_FILE, JSON.stringify(i,null,2)); }catch{} }
function loadEventBoardInfo(){ try{ if(!fs.existsSync(EVENT_BOARD_FILE)) return null; return JSON.parse(fs.readFileSync(EVENT_BOARD_FILE,'utf8')); }catch{ return null; } }
function saveEventBoardInfo(i){ try{ fs.writeFileSync(EVENT_BOARD_FILE, JSON.stringify(i,null,2)); }catch{} }

// DATE
const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function parseTanggalInput(tglStr){
  const jamMatch = tglStr.match(/(\d{1,2}:\d{2})(\s*WIB)?/i);
  const jam = jamMatch ? jamMatch[0].toUpperCase() : '00:00 WIB';
  const dateRegex = /(\d{1,2})\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\w*\s*(\d{4})/i;
  const m = tglStr.match(dateRegex);
  let day, monthIdx, year, dateObj;
  if(m){
    day=parseInt(m[1]);
    const bulanRaw=m[2].toLowerCase();
    const map={ januari:0, februari:1, maret:2, april:3, mei:4, juni:5, juli:6, agustus:7, september:8, oktober:9, november:10, desember:11, jan:0, feb:1, mar:2, apr:3, jun:5, jul:6, agu:7, sep:8, okt:9, nov:10, des:11 };
    monthIdx=map[bulanRaw.substring(0,3)] ?? map[bulanRaw] ?? 9;
    year=parseInt(m[3]);
    dateObj=new Date(year,monthIdx,day);
  } else {
    dateObj=new Date(); day=dateObj.getDate(); monthIdx=dateObj.getMonth(); year=dateObj.getFullYear();
  }
  const dateKey=`${year}-${String(monthIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const dateDisplay=`${String(day).padStart(2,'0')} ${BULAN_ID[monthIdx]} ${year}`;
  return { jam, dateKey, dateDisplay, day, monthIdx, year, dateObj, raw: tglStr };
}
function getNextDays(n=7){
  const days=[]; const today=new Date(); today.setHours(0,0,0,0);
  for(let i=0;i<n;i++){ const d=new Date(today); d.setDate(today.getDate()+i); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const display=`${String(d.getDate()).padStart(2,'0')} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`; days.push({dateObj:d,dateKey:key,dateDisplay:display}); }
  return days;
}

async function updateInvitationBoard(guild){
  try{
    const invitations=loadInvitations();
    const invitationCh=guild.channels.cache.find(c=>c.name==='📨・jadwal-invitation');
    if(!invitationCh) return;
    const grouped={}; invitations.forEach(inv=>{ if(!grouped[inv.dateKey]) grouped[inv.dateKey]=[]; grouped[inv.dateKey].push(inv); });
    let days=getNextDays(7);
    const extraKeys=Object.keys(grouped).filter(k=>!days.some(d=>d.dateKey===k)).sort();
    extraKeys.forEach(k=>{ const sample=grouped[k][0]; days.push({dateKey:k,dateDisplay:sample.dateDisplay,dateObj:new Date(sample.year,sample.monthIdx,sample.day)}); });
    days.sort((a,b)=>a.dateObj-b.dateObj);
    let desc=`**📅 JADWAL INVITATION - ROAR CREW**\n*Max 3 invitation per hari • Auto update dari ticket*\n\n`;
    for(const day of days){
      const list=grouped[day.dateKey]||[]; list.sort((a,b)=>a.jam.localeCompare(b.jam));
      const count=list.length; const max=3;
      desc+=`**📅 Tgl ${day.dateDisplay} (${count}/${max})**\n`;
      if(count===0){ desc+=`-\n-\n-\n\n`; } else { for(let i=0;i<max;i++){ if(i<list.length){ const inv=list[i]; desc+=`${inv.jam} - ${inv.clan} (${inv.judul})\n`; } else desc+=`-\n`; } desc+=`\n`; }
    }
    const embed=new EmbedBuilder().setTitle('📅 BOARD JADWAL INVITATION').setDescription(desc).setColor(0x3498DB).setFooter({text:'ROAR CREW • Board auto update • Max 3/hari'}).setTimestamp();
    const boardInfo=loadBoardInfo();
    if(boardInfo && boardInfo.channelId && boardInfo.messageId){
      try{ const ch=await guild.channels.fetch(boardInfo.channelId); const msg=await ch.messages.fetch(boardInfo.messageId); await msg.edit({embeds:[embed]}); console.log('[BOARD] Edited found board'); return; }catch{}
    }
    try{
      const msgs=await invitationCh.messages.fetch({limit:20});
      const botBoard=msgs.find(m=>m.author.id===client.user.id && m.embeds.length>0 && m.embeds[0].title?.includes('BOARD JADWAL INVITATION'));
      if(botBoard){ await botBoard.edit({embeds:[embed]}); saveBoardInfo({channelId:invitationCh.id,messageId:botBoard.id}); console.log('[BOARD] Edited existing'); return; }
    }catch{}
    const sent=await invitationCh.send({embeds:[embed]});
    saveBoardInfo({channelId:invitationCh.id,messageId:sent.id});
    console.log('[BOARD] Created new board');
  }catch(e){ console.error('[BOARD ERROR]',e.message); }
}

async function updateEventBoard(guild){
  try{
    const events=loadEventsOut();
    const eventCh=guild.channels.cache.find(c=>c.name==='📅・jadwal-event');
    if(!eventCh) return;
    const grouped={}; events.forEach(ev=>{ if(!grouped[ev.dateKey]) grouped[ev.dateKey]=[]; grouped[ev.dateKey].push(ev); });
    let days=getNextDays(7);
    const extraKeys=Object.keys(grouped).filter(k=>!days.some(d=>d.dateKey===k)).sort();
    extraKeys.forEach(k=>{ const sample=grouped[k][0]; days.push({dateKey:k,dateDisplay:sample.dateDisplay,dateObj:new Date(sample.year,sample.monthIdx,sample.day)}); });
    days.sort((a,b)=>a.dateObj-b.dateObj);
    let desc=`**⚔️ JADWAL EVENT - ROAR CREW UNDANG BALIK**\n*Max 3 event per hari • Barter selesai*\n\n`;
    for(const day of days){
      const list=grouped[day.dateKey]||[]; list.sort((a,b)=>a.jam.localeCompare(b.jam));
      const count=list.length; const max=3;
      desc+=`**📅 Tgl ${day.dateDisplay} (${count}/${max})**\n`;
      if(count===0){ desc+=`-\n-\n-\n\n`; } else { for(let i=0;i<max;i++){ if(i<list.length){ const ev=list[i]; desc+=`${ev.jam} - ${ev.clan} (${ev.judul})\n`; } else desc+=`-\n`; } desc+=`\n`; }
    }
    const embed=new EmbedBuilder().setTitle('⚔️ BOARD JADWAL EVENT - UNDANG BALIK').setDescription(desc).setColor(0xFF4500).setFooter({text:'ROAR CREW • Board event • Barter selesai'}).setTimestamp();
    const boardInfo=loadEventBoardInfo();
    if(boardInfo && boardInfo.channelId && boardInfo.messageId){
      try{ const ch=await guild.channels.fetch(boardInfo.channelId); const msg=await ch.messages.fetch(boardInfo.messageId); await msg.edit({embeds:[embed]}); return; }catch{}
    }
    try{
      const msgs=await eventCh.messages.fetch({limit:20});
      const botBoard=msgs.find(m=>m.author.id===client.user.id && m.embeds.length>0 && m.embeds[0].title?.includes('BOARD JADWAL EVENT'));
      if(botBoard){ await botBoard.edit({embeds:[embed]}); saveEventBoardInfo({channelId:eventCh.id,messageId:botBoard.id}); return; }
    }catch{}
    const sent=await eventCh.send({embeds:[embed]});
    saveEventBoardInfo({channelId:eventCh.id,messageId:sent.id});
  }catch(e){ console.error('[EVENT BOARD ERROR]',e.message); }
}

async function logToLogsChannel(guild, data){
  try{
    const logsCh=guild.channels.cache.find(c=>c.name==='📝・logs');
    if(!logsCh) return;
    const embed=new EmbedBuilder()
      .setTitle('📝 INVITATION MASUK - BARTER TRACKING')
      .setDescription(`**Clan ${data.clan} undang ROAR CREW**\nStatus: ❌ Belum undang balik`)
      .addFields(
        {name:'🎯 Clan Pengundang',value:`**${data.clan}**`,inline:true},
        {name:'📅 Tanggal',value:data.dateDisplay,inline:true},
        {name:'⏰ Jam',value:data.jam,inline:true},
        {name:'📝 Judul (Tipe)',value:data.judul,inline:false},
        {name:'👤 Dilapor oleh',value:`<@${data.reporterId}>`,inline:true},
        {name:'✅ Approved by',value:data.approvedByTag,inline:true},
        {name:'📝 Catatan',value:data.catatan||'-',inline:false},
        {name:'🔄 Status Barter',value:`❌ Belum undang balik ke ${data.clan}\nGunakan /undang-balik untuk balas`,inline:false},
      )
      .setColor(0xFF9900).setFooter({text:`History • ${data.clan}`}).setTimestamp();
    await logsCh.send({embeds:[embed]}).catch(()=>{});
  }catch(e){ console.log('[LOG ERROR]',e.message); }
}

async function logUndangBalik(guild, data){
  try{
    const logsCh=guild.channels.cache.find(c=>c.name==='📝・logs');
    if(!logsCh) return;
    const embed=new EmbedBuilder()
      .setTitle('🔄 UNDANG BALIK - BARTER SELESAI')
      .setDescription(`**ROAR CREW undang balik ${data.clan}**\nBarter support selesai ✅`)
      .addFields(
        {name:'🎯 Clan Diundang Balik',value:`**${data.clan}**`,inline:true},
        {name:'📅 Tanggal Event',value:data.tanggalRaw,inline:true},
        {name:'⏰ Jam',value:data.jam,inline:true},
        {name:'📝 Judul',value:data.judul,inline:false},
        {name:'👤 Diundang oleh',value:`<@${data.createdById}>`,inline:true},
        {name:'📝 Catatan',value:data.catatan||'-',inline:false},
        {name:'✅ Status Barter',value:`✅ Sudah undang balik ke ${data.clan}`,inline:false},
      )
      .setColor(0x00FF7F).setFooter({text:`Barter Completed • ${new Date().toLocaleDateString('id-ID')}`}).setTimestamp();
    await logsCh.send({embeds:[embed]}).catch(()=>{});
  }catch(e){ console.log('[LOG BALIK ERROR]',e.message); }
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
  new SlashCommandBuilder().setName('help').setDescription('Lihat semua command ROAR BOT'),
  new SlashCommandBuilder().setName('roar-help').setDescription('📖 Panduan lengkap command ROAR CREW'),
  new SlashCommandBuilder().setName('undang-balik').setDescription('Undang balik clan - masuk ke jadwal-event')
    .addStringOption(o=>o.setName('clan').setDescription('Nama clan yang mau diundang balik').setRequired(true))
    .addStringOption(o=>o.setName('tanggal').setDescription('Tanggal: 06 Oktober 2026').setRequired(true))
    .addStringOption(o=>o.setName('jam').setDescription('Jam: 20:00 WIB').setRequired(true))
    .addStringOption(o=>o.setName('judul').setDescription('Judul event war - bebas INVITATION juga boleh').setRequired(true))
    .addStringOption(o=>o.setName('catatan').setDescription('Catatan/link grup').setRequired(false)),
  new SlashCommandBuilder().setName('announce-barter').setDescription('📢 Post announcement aturan wajib barter (Admin)'),
].map(c => c.toJSON());

async function registerCommands(){
  const rest=new REST({version:'10'}).setToken(token);
  console.log('[SLASH] Registering STABLE...');
  try{ await rest.put(Routes.applicationCommands(client.user.id),{body:commands}); console.log('[SLASH] Global OK'); }catch(e){ console.log('global fail',e.message); }
  try{
    const guilds=await client.guilds.fetch();
    for(const [id, g] of guilds){
      try{ await rest.put(Routes.applicationGuildCommands(client.user.id, id),{body:commands}); console.log(`[SLASH] Guild instant OK ${g.name}`); }catch(err){ console.log(`Guild ${id} fail ${err.message}`); }
      await new Promise(r=>setTimeout(r,500));
    }
  }catch(e){ console.log('guild fetch fail',e.message); }
}

async function ensureStructure(guild){
  await guild.channels.fetch();
  for(const catData of STRUCTURE){
    let category=guild.channels.cache.find(c=>c.type===ChannelType.GuildCategory && c.name===catData.name);
    if(!category){ category=await guild.channels.create({name:catData.name,type:ChannelType.GuildCategory}); await new Promise(r=>setTimeout(r,600)); }
    for(const chData of catData.channels){
      let existing=guild.channels.cache.find(c=>c.name===chData.name && c.parentId===category.id);
      if(existing) continue;
      const perms=[]; if(chData.privateAdmin) perms.push({id:guild.roles.everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]});
      try{ await guild.channels.create({name:chData.name,type:chData.type,parent:category.id,permissionOverwrites:perms}); }catch{ await new Promise(r=>setTimeout(r,1000)); try{ await guild.channels.create({name:chData.name,type:chData.type,parent:category.id,permissionOverwrites:perms}); }catch{} }
      await new Promise(r=>setTimeout(r,600));
    }
  }
}

async function sendTicketEmbed(guild){
  await guild.channels.fetch();
  const ticketChannel=guild.channels.cache.find(c=>c.name==='🎫・ticket');
  if(!ticketChannel) return false;
  const embed=new EmbedBuilder()
    .setTitle('🎫 ROAR CREW - TICKET INVITATION SYSTEM')
    .setDescription('**Dapat undangan dari clan lain? Lapor di sini!**\n\n🔹 **Lapor Diundang Clan Lain** → Clan lain undang kita, lapor biar masuk jadwal & ke-track di #logs buat barter balik\n🔹 **Report / Bantuan** → Lapor masalah\n\n*Judul bebas - INVITATION juga boleh, kan ada kolom clan pengundang*')
    .setColor(0xFF9900)
    .setFooter({text:'ROAR CREW • Barter System • Judul bebas'});
  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('create_ticket_invitation').setLabel('📨 Lapor Diundang Clan Lain').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('create_ticket_report').setLabel('🚨 Report / Bantuan').setStyle(ButtonStyle.Secondary),
  );
  try{ const msgs=await ticketChannel.messages.fetch({limit:10}); for(const m of msgs.values()){ if(m.author.id===client.user.id) await m.delete().catch(()=>{}); } }catch{}
  await ticketChannel.send({embeds:[embed],components:[row]});
  return true;
}

client.once(Events.ClientReady, async ()=>{
  console.log(`🦁 ${client.user.tag} STABLE BARTER + ANNOUNCEMENT ONLINE!`);
  await registerCommands();
  for(const guild of client.guilds.cache.values()){
    await guild.channels.fetch().catch(()=>{});
    await updateInvitationBoard(guild).catch(()=>{});
    await updateEventBoard(guild).catch(()=>{});
  }
});

client.on(Events.InteractionCreate, async (interaction)=>{
  try{
    if(interaction.isChatInputCommand()){
      if(interaction.commandName==='setup-roar'){
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content:'❌ Hanya admin!',ephemeral:true});
        await interaction.deferReply({ephemeral:true}); await interaction.editReply('⏳ Bikin struktur... 20 detik');
        try{ await ensureStructure(interaction.guild); await sendTicketEmbed(interaction.guild); await updateInvitationBoard(interaction.guild); return interaction.editReply('✅ Struktur ROAR CREW + Barter System berhasil!'); }catch(e){ return interaction.editReply(`❌ Error: ${e.message}`); }
      }
      if(interaction.commandName==='tiket-setup'){
        await interaction.deferReply({ephemeral:true}); const ok=await sendTicketEmbed(interaction.guild); if(!ok) return interaction.editReply('❌ Channel 🎫・ticket belum ada'); return interaction.editReply('✅ Embed tiket dikirim!');
      }
      if(interaction.commandName==='board-refresh'){
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content:'❌ Hanya admin!',ephemeral:true});
        await interaction.deferReply({ephemeral:true}); await updateInvitationBoard(interaction.guild); await updateEventBoard(interaction.guild); return interaction.editReply('✅ Board di-refresh!');
      }
      if(interaction.commandName==='history-clan'){
        await interaction.deferReply({ephemeral:true}); const invitations=loadInvitations(); const clanFilter=interaction.options.getString('clan'); let filtered=invitations; if(clanFilter) filtered=invitations.filter(i=>i.clan.toLowerCase().includes(clanFilter.toLowerCase())); if(filtered.length===0) return interaction.editReply(`❌ Tidak ada history ${clanFilter||''}`); const byClan={}; filtered.forEach(inv=>{ if(!byClan[inv.clan]) byClan[inv.clan]=[]; byClan[inv.clan].push(inv); }); let desc=`**📝 HISTORY CLAN**\nTotal: ${filtered.length}\n\n`; for(const [clan,list] of Object.entries(byClan)){ desc+=`**${clan}** - ${list.length}x\n`; list.slice(-3).forEach(inv=>{ desc+=`└ ${inv.dateDisplay} ${inv.jam}\n`; }); desc+=`\n`; } const embed=new EmbedBuilder().setTitle('📝 History Clan').setDescription(desc).setColor(0xFFD700); return interaction.editReply({embeds:[embed]});
      }
      if(interaction.commandName==='absen'){
        const absenCh=interaction.guild.channels.cache.find(c=>c.name==='✅・absen-harian'); if(!absenCh) return interaction.reply({content:'Channel absen tidak ada',ephemeral:true}); const embed=new EmbedBuilder().setTitle('✅ Absen Harian').setDescription(`${interaction.user} absen <t:${Math.floor(Date.now()/1000)}:F>`).setColor(0x00FF00).setThumbnail(interaction.user.displayAvatarURL()); await absenCh.send({embeds:[embed]}); return interaction.reply({content:`✅ Absen di ${absenCh}`,ephemeral:true});
      }
      if(interaction.commandName==='list-member'){
        await interaction.deferReply(); await interaction.guild.members.fetch(); const embed=new EmbedBuilder().setTitle('📊 MEMBER STATS').setDescription(`Total: **${interaction.guild.memberCount}**`).setColor(0x3498DB); return interaction.editReply({embeds:[embed]});
      }
      if(interaction.commandName==='help' || interaction.commandName==='roar-help'){
        const embed=new EmbedBuilder()
          .setTitle('🦁 ROAR CREW - COMMAND LENGKAP')
          .setDescription('**Barter System + Judul Bebas**')
          .setColor(0xFF9900)
          .addFields(
            {name:'🔧 ADMIN',value:'/setup-roar - bikin struktur\n/tiket-setup - refresh ticket\n/board-refresh - refresh board\n/announce-barter - announcement barter',inline:false},
            {name:'📅 INVITATION MASUK',value:'/history-clan - lihat history clan\nFlow: #ticket → Lapor → Approve → #jadwal-invitation + board + #logs',inline:false},
            {name:'⚔️ UNDANG BALIK',value:'/undang-balik clan:CDM tanggal:07 Oktober 2026 jam:20:00 WIB judul:INVITATION - bebas!\n→ #jadwal-event + logs ✅',inline:false},
            {name:'👥 MEMBER',value:'/absen - absen harian\n/list-member - stats',inline:false},
            {name:'📢 BARTER',value:'Judul bebas! INVITATION, War, Fun Match, Scrim - boleh! Kan ada kolom clan pengundang',inline:false},
          )
          .setFooter({text:'ROAR CREW • Stable Version'}).setTimestamp();
        return interaction.reply({embeds:[embed],ephemeral:false});
      }
      if(interaction.commandName==='undang-balik'){
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({content:'❌ Hanya Moderator/Admin!',ephemeral:true});
        await interaction.deferReply({ephemeral:true});
        const clan=interaction.options.getString('clan'); const tanggal=interaction.options.getString('tanggal'); const jam=interaction.options.getString('jam'); const judul=interaction.options.getString('judul'); const catatan=interaction.options.getString('catatan')||'-';
        const tanggalGabung=`${tanggal} ${jam}`; const parsed=parseTanggalInput(tanggalGabung);
        const eventCh=interaction.guild.channels.cache.find(c=>c.name==='📅・jadwal-event'); if(!eventCh) return interaction.editReply('❌ Channel 📅・jadwal-event tidak ada!');
        const events=loadEventsOut();
        const newEvent={id:Date.now().toString(),clan,tanggalRaw:tanggalGabung,dateKey:parsed.dateKey,dateDisplay:parsed.dateDisplay,day:parsed.day,monthIdx:parsed.monthIdx,year:parsed.year,jam:parsed.jam,judul,catatan,createdById:interaction.user.id,createdByTag:interaction.user.tag,createdByUsername:interaction.user.username,timestamp:Date.now(),type:'undang-balik'};
        events.push(newEvent); saveEventsOut(events);
        const embed=new EmbedBuilder().setTitle(`⚔️ ROAR UNDANG BALIK: ${judul}`).addFields({name:'🎯 Clan Diundang',value:`**${clan}**`,inline:true},{name:'📅 Tanggal',value:tanggal,inline:true},{name:'⏰ Jam',value:jam,inline:true},{name:'📝 Judul',value:judul,inline:false},{name:'📝 Catatan/Link',value:catatan,inline:false},{name:'👤 Diundang oleh',value:`${interaction.user}`,inline:true}).setColor(0xFF4500).setFooter({text:`Barter • ${parsed.dateDisplay}`}).setTimestamp();
        try{ await eventCh.send({content:`@everyone ⚔️ **ROAR UNDANG BALIK ${clan.toUpperCase()}**`,embeds:[embed]}); }catch{ await eventCh.send({embeds:[embed]}).catch(()=>{}); }
        try{ await logUndangBalik(interaction.guild,newEvent); }catch{}
        try{ await updateEventBoard(interaction.guild); await updateInvitationBoard(interaction.guild); }catch{}
        return interaction.editReply(`✅ Berhasil undang balik ${clan}! → ${eventCh} + board + logs`);
      }
      if(interaction.commandName==='announce-barter'){
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content:'❌ Hanya Admin!',ephemeral:true});
        const publicCh=interaction.guild.channels.cache.find(c=>c.name==='💬・public-chat');
        const ticketCh=interaction.guild.channels.cache.find(c=>c.name==='🎫・ticket');
        const invitationCh=interaction.guild.channels.cache.find(c=>c.name==='📨・jadwal-invitation');
        const eventCh=interaction.guild.channels.cache.find(c=>c.name==='📅・jadwal-event');
        const logsCh=interaction.guild.channels.cache.find(c=>c.name==='📝・logs');
        const embed=new EmbedBuilder()
          .setTitle('📢 ATURAN BARU - INVITATION WAJIB BARTER - ROAR CREW')
          .setDescription(`@everyone **WAJIB BACA - SISTEM BARTER BARU!**\n\nMulai sekarang setiap clan yang undang ROAR CREW, kita **WAJIB** undang balik!`)
          .setColor(0xFF0000)
          .addFields(
            {name:'🔄 KENAPA WAJIB BARTER?',value:`• Clan lain support ROAR, kita balas!\n• Tracking di ${logsCh||'#logs'} biar tau sudah/belum dibalas\n• Jaga hubungan baik antar clan!`,inline:false},
            {name:'📥 KALO DAPET UNDANGAN - CARA LAPOR',value:`1️⃣ Pergi ke ${ticketCh||'#ticket'}\n2️⃣ Klik **📨 Lapor Diundang Clan Lain**\n3️⃣ Isi form:\n   • **Judul**: Bebas! INVITATION, War, Fun Match, Scrim - bebas! (tipe undangan)\n   • **Tanggal & Jam**: 07 Oktober 2026 20:00 WIB\n   • **Clan Pengundang**: CDM, LUNOVE VEXNIGHT\n   • **Link/Catatan**: Link WA/Discord\n4️⃣ Ticket private auto kebikin\n5️⃣ Admin Approve → Auto post ke ${invitationCh||'#jadwal-invitation'} + board + ${logsCh||'#logs'}`,inline:false},
            {name:'📤 CARA UNDANG BALIK (Admin)',value:`/undang-balik clan:CDM tanggal:07 Oktober 2026 jam:20:00 WIB judul:INVITATION - judul bebas!\n→ ${eventCh||'#jadwal-event'} + logs ✅`,inline:false},
            {name:'📅 CEK JADWAL DIMANA?',value:`• ${invitationCh||'#jadwal-invitation'} - invitation MASUK (clan lain undang ROAR)\n• ${eventCh||'#jadwal-event'} - event KELUAR (ROAR undang balik)\n• ${logsCh||'#logs'} - history + status barter\n• /history-clan - cek clan\n• /roar-help - panduan`,inline:false},
            {name:'⚠️ ATURAN WAJIB',value:`• Setiap dapet undangan WAJIB lapor via ticket!\n• Max 3/hari\n• Link wajib dicantumkan\n• Judul bebas - kan ada kolom clan pengundang sendiri!`,inline:false},
          )
          .setFooter({text:'ROAR CREW • Barter • Judul Bebas'}).setTimestamp().setThumbnail(interaction.guild.iconURL());
        await interaction.reply({content:'@everyone 📢 **ATURAN BARU WAJIB BACA!**',embeds:[embed]});
        if(publicCh && publicCh.id!==interaction.channel.id){ await publicCh.send({content:'@everyone 📢 **ATURAN BARU - BARTER SYSTEM!**',embeds:[embed]}).catch(()=>{}); }
      }
    }

    // BUTTON - TICKET
    if(interaction.isButton() && (interaction.customId.startsWith('create_ticket') || interaction.customId.includes('invitation') || interaction.customId.includes('request') || interaction.customId.includes('report') || interaction.customId.includes('bantuan'))){
      const id=interaction.customId.toLowerCase();
      const isInv=id.includes('invitation') || id.includes('request') || id==='create_ticket_invitation';
      const isReport=id.includes('report') || id.includes('bantuan') || id==='create_ticket_report';
      if(isInv){
        try{
          const modal=new ModalBuilder().setCustomId('modal_invitation').setTitle('Diundang Clan Lain - Lapor');
          const j=new TextInputBuilder().setCustomId('judul').setLabel('Judul / Tipe Undangan - BEBAS!').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('INVITATION, War, Fun Match, Scrim - bebas!');
          const t=new TextInputBuilder().setCustomId('tanggal').setLabel('Tanggal & Jam (Contoh: 06 Okt 2026 20:00)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('06 Oktober 2026 20:00 WIB');
          const tar=new TextInputBuilder().setCustomId('target').setLabel('Clan Pengundang (Yang Undang Kita)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('LUNOVE VEXNIGHT');
          const c=new TextInputBuilder().setCustomId('catatan').setLabel('Link Grup / Catatan').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('Link WA/Discord');
          modal.addComponents(new ActionRowBuilder().addComponents(j),new ActionRowBuilder().addComponents(t),new ActionRowBuilder().addComponents(tar),new ActionRowBuilder().addComponents(c));
          return await interaction.showModal(modal);
        }catch(e){ console.error('[MODAL ERROR]',e); return interaction.reply({content:'❌ Error buka form, run /tiket-setup',ephemeral:true}).catch(()=>{}); }
      } else if(isReport){
        await interaction.deferReply({ephemeral:true});
        const guild=interaction.guild; const category=guild.channels.cache.find(c=>c.name==='│ SUPPORT' && c.type===ChannelType.GuildCategory);
        const channel=await guild.channels.create({name:`ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g,'-').substring(0,30),type:ChannelType.GuildText,parent:category?.id,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},{id:interaction.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]},{id:client.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ManageChannels]}]});
        const embed=new EmbedBuilder().setTitle('🚨 Ticket Report').setDescription(`Halo ${interaction.user}`).setColor(0x95A5A6);
        const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close').setStyle(ButtonStyle.Danger));
        await channel.send({content:`${interaction.user}`,embeds:[embed],components:[row]}); return interaction.editReply({content:`✅ Ticket: ${channel}`});
      }
    }

    // APPROVE - ANTI GAGAL TOTAL
    if(interaction.isButton() && interaction.customId==='approve_invitation'){
      try{ await interaction.deferReply({ephemeral:true}); }catch{ try{ await interaction.reply({content:'⏳ Processing...',ephemeral:true}); }catch{} }
      try{
        const guild=interaction.guild; await guild.channels.fetch().catch(()=>{});
        const invitationCh=guild.channels.cache.find(c=>c.name==='📨・jadwal-invitation');
        if(!invitationCh) return interaction.editReply({content:'❌ Channel invitation tidak ada! /setup-roar'}).catch(()=>{});
        const messages=await interaction.channel.messages.fetch({limit:20}).catch(()=>null);
        if(!messages) return interaction.editReply('❌ Gagal fetch').catch(()=>{});
        const botEmbedMsg=messages.find(m=>m.embeds.length>0 && (m.embeds[0].title?.includes('Diundang') || m.embeds[0].title?.includes('INVITATION')));
        if(!botEmbedMsg) return interaction.editReply({content:'❌ Embed hilang'}).catch(()=>{});
        const emb=botEmbedMsg.embeds[0];
        let judul=emb.title.replace('📨 Diundang:','').trim()||'INVITATION';
        if(!judul) judul='INVITATION';
        const tanggalRaw=emb.fields.find(f=>f.name.includes('Tanggal'))?.value||'06 Oktober 2026 20:00 WIB';
        const clan=emb.fields.find(f=>f.name.includes('Diundang'))?.value||'UNKNOWN';
        const catatan=emb.fields.find(f=>f.name.includes('Link')||f.name.includes('Catatan'))?.value||'-';
        const reporterMention=emb.fields.find(f=>f.name.includes('Dilapor'))?.value||'';
        const reporterIdMatch=reporterMention.match(/<@!?(\d+)>/);
        const reporterId=reporterIdMatch?reporterIdMatch[1]:interaction.user.id;
        const parsed=parseTanggalInput(tanggalRaw);
        const invitations=loadInvitations();
        const newInv={id:Date.now().toString(),judul,tanggalRaw,dateKey:parsed.dateKey,dateDisplay:parsed.dateDisplay,day:parsed.day,monthIdx:parsed.monthIdx,year:parsed.year,jam:parsed.jam,clan,catatan,reporterId,reporterTag:interaction.user.tag,reporterUsername:interaction.user.username,approvedByTag:interaction.user.tag,approvedById:interaction.user.id,timestamp:Date.now()};
        invitations.push(newInv); saveInvitations(invitations);
        console.log(`[APPROVE] ${judul} dari ${clan}`);
        const prettyEmbed=new EmbedBuilder().setTitle(`📨 INVITATION: ${judul}`).addFields({name:'🎯 Clan Pengundang',value:`**${clan}**`,inline:true},{name:'📅 Tanggal',value:parsed.dateDisplay,inline:true},{name:'⏰ Jam',value:parsed.jam,inline:true},{name:'📝 Judul (Tipe) - Bebas!',value:judul,inline:false},{name:'📝 Link/Catatan',value:catatan.substring(0,1000),inline:false},{name:'👤 Dilapor oleh',value:`<@${reporterId}>`,inline:true},{name:'✅ Approved by',value:`${interaction.user.tag}`,inline:true}).setColor(0x00FF00).setFooter({text:`Barter • ${clan}`}).setTimestamp();
        try{ await invitationCh.send({content:`@everyone 📨 **INVITATION DARI ${clan.toUpperCase()} - ${judul}**`,embeds:[prettyEmbed]}); }catch{ try{ await invitationCh.send({embeds:[prettyEmbed]}); }catch{} }
        try{ await logToLogsChannel(guild,newInv); }catch{}
        try{ await updateInvitationBoard(guild); }catch{}
        await interaction.editReply({content:`✅ BERHASIL! **${judul}** dari **${clan}** → ${invitationCh}! Channel hapus 5 detik.`}).catch(()=>{});
        setTimeout(()=>{ interaction.channel.delete().catch(()=>{}); },5000);
      }catch(err){
        console.error('[APPROVE ERROR]',err);
        try{ await interaction.editReply({content:`❌ Error: ${err.message}`}).catch(()=>{}); setTimeout(()=>{ interaction.channel.delete().catch(()=>{}); },3000); }catch{}
      }
    }

    if(interaction.isButton() && interaction.customId==='close_ticket'){
      await interaction.reply({content:'🔒 Closing...'}); setTimeout(()=>interaction.channel.delete().catch(()=>{}),2000);
    }

    if(interaction.isModalSubmit() && interaction.customId==='modal_invitation'){
      await interaction.deferReply({ephemeral:true});
      const guild=interaction.guild; const category=guild.channels.cache.find(c=>c.name==='│ SUPPORT' && c.type===ChannelType.GuildCategory);
      let judul=interaction.fields.getTextInputValue('judul').trim(); const tanggal=interaction.fields.getTextInputValue('tanggal').trim(); const target=interaction.fields.getTextInputValue('target').trim(); const catatan=interaction.fields.getTextInputValue('catatan').trim()||'-';
      if(!judul) judul='INVITATION';
      // Hapus ticket lama biar ga numpuk
      try{ const existing=guild.channels.cache.filter(c=>c.name.startsWith(`inv-${interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g,'-').substring(0,20)}) && c.parentId===category?.id); for(const [id,ch] of existing){ if(ch.id!==interaction.channel?.id){ await ch.delete().catch(()=>{}); await new Promise(r=>setTimeout(r,300)); } } }catch{}
      const channel=await guild.channels.create({name:`inv-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g,'-').substring(0,30),type:ChannelType.GuildText,parent:category?.id,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},{id:interaction.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]},{id:client.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ManageChannels]}]});
      const parsed=parseTanggalInput(tanggal);
      const embed=new EmbedBuilder().setTitle(`📨 Diundang: ${judul}`).addFields({name:'📆 Tanggal Invitation',value:tanggal,inline:true},{name:'📩 Diundang Oleh (Clan Pengundang)',value:target,inline:true},{name:'⏰ Jam Parsed',value:parsed.jam,inline:true},{name:'📝 Link / Catatan',value:catatan.substring(0,1000)},{name:'👤 Dilapor oleh',value:`${interaction.user}`}).setColor(0x3498DB).setTimestamp().setFooter({text:`Akan masuk board: ${parsed.dateDisplay} • Judul bebas - ${judul}`});
      const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('approve_invitation').setLabel('✅ Approve & Post ke Board').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Tolak').setStyle(ButtonStyle.Danger));
      await channel.send({embeds:[embed],components:[row]}); return interaction.editReply({content:`✅ Request di ${channel} - Judul: **${judul}** (bebas!)`});
    }
  }catch(err){ console.error('[ERROR]',err); }
});

client.login(token);
