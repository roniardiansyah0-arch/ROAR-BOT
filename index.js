const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, Events } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end('ROAR BOT #5318 is READY - '+new Date().toISOString()+' - TOKEN:'+(!!process.env.DISCORD_TOKEN));
}).listen(PORT, ()=>console.log(`[WEB] Listening on ${PORT}`));

// DEBUG WAJIB
console.log('[CHECK] DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
console.log('[CHECK] DISCORD_TOKEN length:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);
console.log('[CHECK] PORT:', PORT);

process.on('unhandledRejection', err => { console.error('[ANTI-CRASH] Unhandled Rejection:', err); });
process.on('uncaughtException', err => { console.error('[ANTI-CRASH] Uncaught Exception:', err); });

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const CONFIG = { OWNER_NAME: "RONNSYH", MAP_NAME: "JAVA KOPLO", FAMS_NAME: "ROAR CREW" };
const INV_FILE = './invitations.json';
const DRAFT_FILE = './drafts.json';

function loadInv(){ try{ if(fs.existsSync(INV_FILE)) return JSON.parse(fs.readFileSync(INV_FILE,'utf8')); }catch(e){} return {}; }
function saveInv(data){ try{ fs.writeFileSync(INV_FILE, JSON.stringify(data,null,2)); }catch(e){} }
function loadDraftFile(){ try{ if(fs.existsSync(DRAFT_FILE)) return JSON.parse(fs.readFileSync(DRAFT_FILE,'utf8')); }catch(e){} return {}; }
function saveDraftFile(data){ try{ fs.writeFileSync(DRAFT_FILE, JSON.stringify(data,null,2)); }catch(e){} }
function parseDate(str){
    str=str.trim().replace(/\//g,'-'); let parts=str.split('-'); let d,m,y;
    if(parts.length===3){ if(parts[0].length===4){ y=parseInt(parts[0]); m=parseInt(parts[1])-1; d=parseInt(parts[2]); } else { d=parseInt(parts[0]); m=parseInt(parts[1])-1; y=parseInt(parts[2]); if(y<100) y+=2000; } const date=new Date(y,m,d); if(isNaN(date)) return null; if(date.getDate()!==d || date.getMonth()!==m) return null; return date; } return null;
}
function toKey(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function formatIndo(date){ const months=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; return `${String(date.getDate()).padStart(2,'0')} ${months[date.getMonth()]} ${date.getFullYear()}`; }
function formatIndoFromKey(key){ const [y,m,d]=key.split('-').map(Number); return formatIndo(new Date(y,m-1,d)); }
function getAvailableDates(invData, days=60){ const res=[]; const today=new Date(); today.setHours(0,0,0,0); for(let i=0;i<days;i++){ const date=new Date(today); date.setDate(today.getDate()+i); const key=toKey(date); const count=(invData[key]||[]).length; if(count<3) res.push({key,date,count,free:3-count}); } return res; }

async function updateJadwalChannel(guild){
    try{
        const invData=loadInv();
        const ch=guild.channels.cache.find(c=>c.name.includes('jadwal-invitation') && c.type===ChannelType.GuildText);
        if(!ch) return;
        const today=new Date(); today.setHours(0,0,0,0);
        let desc=`**📅 AUTO ROLLING SCHEDULE - Hari ini: ${formatIndo(today)}**\nMenampilkan 30 hari ke depan!\nMax 3 undangan/hari\n\n`;
        for(let i=0;i<30;i++){ const date=new Date(today); date.setDate(today.getDate()+i); const key=toKey(date); const list=invData[key]||[]; desc+=`**📅 Tgl ${formatIndo(date)} (${list.length}/3)${i===0?' ⭐ HARI INI':''}**\n`; if(list.length===0) desc+=`-\n-\n-\n`; else { list.forEach((inv,idx)=>{ desc+=`${idx+1}. ${inv.jam} - **${inv.fams}**\n`; }); for(let s=list.length; s<3; s++) desc+=`-\n`; } desc+=`\n`; if(desc.length>3800) break; }
        const embed=new EmbedBuilder().setColor(0x00FF00).setTitle(`📅 JADWAL INVITATION - ${CONFIG.FAMS_NAME}`).setDescription(desc.substring(0,4000)).setFooter({text:`Auto rolling 30 hari • Hari ini ${formatIndo(today)}`}).setTimestamp();
        const msgs=await ch.messages.fetch({limit:15}).catch(()=>null);
        const botMsg=msgs?msgs.find(m=>m.author.id===client.user.id && m.embeds[0]?.title?.includes('JADWAL INVITATION')):null;
        if(botMsg) await botMsg.edit({embeds:[embed]}).catch(async()=>{ await ch.send({embeds:[embed]}); });
        else await ch.send({embeds:[embed]});
    }catch(e){ console.log('Jadwal err', e.message); }
}

const pendingDrafts=new Map();
function loadDraftsToMap(){ const data = loadDraftFile(); Object.entries(data).forEach(([k,v])=>{ if(v.dateStr) v.dateObj = new Date(v.dateStr); pendingDrafts.set(k,v); }); console.log(`[DRAFT] Loaded ${pendingDrafts.size} drafts`); }
function persistDrafts(){ const obj={}; pendingDrafts.forEach((v,k)=>{ const copy={...v}; if(v.dateObj) copy.dateStr = v.dateObj instanceof Date ? v.dateObj.toISOString() : v.dateObj; delete copy.dateObj; obj[k]=copy; }); saveDraftFile(obj); }
async function updateMemberCount(guild){ try{ const ch=guild.channels.cache.find(c=>c.name.includes('Member:') && c.type===ChannelType.GuildVoice); if(ch) await ch.setName(`👥・Member: ${guild.memberCount}`).catch(()=>{}); }catch(e){} }

client.once(Events.ClientReady,()=>{
    console.log(`🦁 ${client.user.tag} ONLINE - SUCCESS! Today ${formatIndo(new Date())}`);
    if(!fs.existsSync(INV_FILE)) saveInv(loadInv());
    loadDraftsToMap();
});
client.once('ready', ()=>{ console.log(`[READY-LEGACY] ${client.user.tag} ready`); });
client.on('guildMemberAdd',async(m)=>{ try{ await updateMemberCount(m.guild); }catch(e){} });
client.on('guildMemberRemove',async(m)=>{ try{ await updateMemberCount(m.guild); }catch(e){} });

client.on('interactionCreate', async (interaction)=>{
  try{
    if(interaction.isButton()){
        if(interaction.customId.startsWith('role_')){
            await interaction.deferReply({flags: MessageFlags.Ephemeral}).catch(()=>{});
            const roleName=interaction.customId.replace('role_',''); const role=interaction.guild.roles.cache.find(r=>r.name.toUpperCase()===roleName.toUpperCase());
            if(!role) return interaction.editReply({content:`❌ Role ${roleName} tidak ditemukan!`}).catch(()=>{});
            const member=interaction.member; if(member.roles.cache.has(role.id)){ await member.roles.remove(role).catch(()=>{}); return interaction.editReply({content:`✅ Role **${role.name}** dilepas!`}).catch(()=>{}); } else { await member.roles.add(role).catch(()=>{}); return interaction.editReply({content:`✅ Role **${role.name}** diambil!`}).catch(()=>{}); }
        }
        if(interaction.customId==='create_ticket'){
            const modal=new ModalBuilder().setCustomId('ticket_modal').setTitle('Form Invitation ROAR CREW');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fams').setLabel('Nama Fams').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tanggal').setLabel('Tanggal (DD-MM-YYYY)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('26-09-2026')), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('jam').setLabel('Jam WIB').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('20:00')), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('map').setLabel('Map').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('jenis_kontak').setLabel('Jenis & Kontak (contoh: FRIENDLY - 0812...)').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(modal).catch(e=>console.error('showModal err', e));
        }
        if(interaction.customId.startsWith('send_invitation_')){
            await interaction.deferReply().catch(()=>{});
            const ticketChannelId=interaction.customId.replace('send_invitation_','');
            const draft=pendingDrafts.get(ticketChannelId) || pendingDrafts.get(interaction.channelId);
            if(!draft) return interaction.editReply({content:'❌ Draft tidak ditemukan, buat ticket baru!'}).catch(()=>{});
            const invData=loadInv(); const count=(invData[draft.key]||[]).length;
            if(count>=3) return interaction.editReply({content:`❌ Tanggal ${formatIndoFromKey(draft.key)} sudah penuh (3/3)!`}).catch(()=>{});
            if(!invData[draft.key]) invData[draft.key]=[];
            invData[draft.key].push({fams:draft.fams,map:draft.map,jam:draft.jam,jenis:draft.jenis,kontak:draft.kontak,creatorId:draft.creatorId,creatorTag:draft.creatorTag,createdAt:new Date().toISOString()});
            saveInv(invData);
            await updateJadwalChannel(interaction.guild).catch(()=>{});
            const embed=new EmbedBuilder().setColor(0x00FF00).setTitle(`✅ UNDANGAN TERKIRIM - ${draft.fams}`).addFields({name:'👥 Fams',value:draft.fams,inline:true},{name:'📅 Tanggal',value:formatIndoFromKey(draft.key),inline:true},{name:'🕐 Jam',value:draft.jam,inline:true}).setTimestamp();
            await interaction.editReply({embeds:[embed]}).catch(()=>{});
            pendingDrafts.delete(ticketChannelId); pendingDrafts.delete(interaction.channelId); persistDrafts();
            await interaction.channel.send({content:`Ticket akan ditutup dalam 10 detik...`}).catch(()=>{});
            setTimeout(()=>{ interaction.channel.delete().catch(()=>{}); },10000);
        }
        if(interaction.customId==='close_ticket'){
            await interaction.reply({content:'Ticket ditutup...'}).catch(()=>{});
            pendingDrafts.delete(interaction.channelId); persistDrafts();
            setTimeout(()=>{ interaction.channel.delete().catch(()=>{}); },3000);
        }
    }
    if(interaction.isModalSubmit()){
        if(interaction.customId==='ticket_modal'){
            await interaction.deferReply({flags: MessageFlags.Ephemeral}).catch(()=>{});
            const fams=interaction.fields.getTextInputValue('fams'); const tglStr=interaction.fields.getTextInputValue('tanggal'); const jam=interaction.fields.getTextInputValue('jam'); const map=interaction.fields.getTextInputValue('map'); const jenisKontak=interaction.fields.getTextInputValue('jenis_kontak');
            let jenis=jenisKontak; let kontak=jenisKontak; const split=jenisKontak.split('-'); if(split.length>=2){ jenis=split[0].trim(); kontak=split.slice(1).join('-').trim(); }
            const dateObj=parseDate(tglStr); if(!dateObj) return interaction.editReply({content:`❌ Format tanggal salah! Gunakan DD-MM-YYYY contoh 26-09-2026`}).catch(()=>{});
            const key=toKey(dateObj); const invData=loadInv(); const count=(invData[key]||[]).length; if(count>=3) return interaction.editReply({content:`❌ Tanggal ${formatIndo(dateObj)} sudah penuh (3/3)! Pilih tanggal lain.`}).catch(()=>{});
            const guild=interaction.guild; const ticketCat=guild.channels.cache.find(c=>c.name.toLowerCase().includes('ticket') && c.type===ChannelType.GuildCategory) || guild.channels.cache.find(c=>c.type===ChannelType.GuildCategory);
            if(!ticketCat) return interaction.editReply({content:'❌ Category ticket tidak ditemukan! Buat category bernama Ticket dulu.'}).catch(()=>{});
            const overwrites=[{id:guild.id,deny:[PermissionFlagsBits.ViewChannel]},{id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},{id:client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels]}];
            try{
                const ticketChannel=await guild.channels.create({name:`🎫・ticket-${interaction.user.username.toLowerCase()}`, type:ChannelType.GuildText, parent:ticketCat.id, permissionOverwrites:overwrites});
                const draftData={fams,map,jam,jenis,kontak,key,dateObj,creatorId:interaction.user.id,creatorTag:interaction.user.tag,status:'draft', dateStr: dateObj.toISOString()};
                pendingDrafts.set(ticketChannel.id,draftData); persistDrafts();
                const draftEmbed=new EmbedBuilder().setColor(0xFFA500).setTitle(`📝 FORMAT UNDANGAN - ${fams}`).setDescription(`**Cek kembali sebelum kirim ke ADMIN!**`).addFields({name:'👥 Fams',value:fams,inline:true},{name:'📅 Tanggal',value:`${formatIndo(dateObj)} (${count}/3 → ${count+1}/3)`,inline:true},{name:'🕐 Jam',value:jam,inline:true},{name:'🎯 Jenis',value:jenis,inline:true},{name:'🗺 Map',value:map,inline:true},{name:'📞 Kontak',value:kontak.substring(0,1000),inline:false}).setFooter({text:`Jika benar, klik Kirim Undangan!`}).setTimestamp();
                const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`send_invitation_${ticketChannel.id}`).setLabel('📤 Kirim Undangan ke Admin').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Batal').setStyle(ButtonStyle.Danger));
                await ticketChannel.send({content:`<@${interaction.user.id}> - Draft:`, embeds:[draftEmbed], components:[row]}).catch(()=>{});
                await interaction.editReply({content:`✅ Form diterima! Ticket di <#${ticketChannel.id}>`}).catch(()=>{});
            }catch(e){ console.error('modal err', e); await interaction.editReply({content:`❌ Error: ${e.message}`}).catch(()=>{}); }
        }
    }
  }catch(err){
    console.error('[Interaction Error]', err);
    try{ if(!interaction.replied && !interaction.deferred){ await interaction.reply({content:'❌ Terjadi error, coba lagi!', flags: MessageFlags.Ephemeral}).catch(()=>{}); } else { await interaction.followUp({content:'❌ Terjadi error, coba lagi!', flags: MessageFlags.Ephemeral}).catch(()=>{}); } }catch(e){}
  }
});

client.on('messageCreate', async (message)=>{
    if(message.author.bot) return;
    const content=message.content.toLowerCase().trim();
    if(content==='!roar'){ const embed=new EmbedBuilder().setColor(0xFFA500).setTitle(`🦁 ${CONFIG.FAMS_NAME}`).setDescription(`Family resmi ${CONFIG.MAP_NAME}`).setTimestamp(); return message.reply({embeds:[embed]}); }
    if(content==='!ticket' || content==='!tiket'){
        const embed=new EmbedBuilder().setColor(0xFFA500).setTitle(`🎫 TICKET - ${CONFIG.FAMS_NAME}`).setDescription(`**Flow:**\n1. Ambil Ticket → Isi Form\n2. Kirim Undangan\n3. Mohon ditunggu\n4. Admin Terima/Tolak\n5. Diterima=masuk jadwal max 3/hari`).setTimestamp();
        const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 Ambil Ticket - Isi Form').setStyle(ButtonStyle.Success));
        return message.reply({embeds:[embed],components:[row]});
    }
});

const token = process.env.DISCORD_TOKEN;
if(!token){
    console.error('❌ DISCORD_TOKEN TIDAK ADA! Set di Render > Environment > DISCORD_TOKEN');
} else {
    console.log('[LOGIN] Attempting login with token length', token.length);
    client.login(token).then(()=>console.log('[LOGIN] Login promise resolved... waiting for READY')).catch(e=>console.error('Login failed:', e.message, e.code));
}
