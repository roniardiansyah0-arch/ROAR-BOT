const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, Events } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end('ROAR BOT #5318 is READY - '+new Date().toISOString());
}).listen(PORT, ()=>console.log(`[WEB] Listening on ${PORT}`));

// Anti-crash
process.on('unhandledRejection', err => {
  console.error('[ANTI-CRASH] Unhandled Rejection:', err);
});
process.on('uncaughtException', err => {
  console.error('[ANTI-CRASH] Uncaught Exception:', err);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const CONFIG = { OWNER_NAME: "RONNSYH", MAP_NAME: "JAVA KOPLO", FAMS_NAME: "ROAR CREW" };
const INV_FILE = './invitations.json';
const DRAFT_FILE = './drafts.json';

function loadInv(){
    try{ if(fs.existsSync(INV_FILE)) return JSON.parse(fs.readFileSync(INV_FILE,'utf8')); }catch(e){ console.error('loadInv err', e.message) }
    return {};
}
function saveInv(data){
    try{ fs.writeFileSync(INV_FILE, JSON.stringify(data,null,2)); }catch(e){ console.error('saveInv err', e.message) }
}
function loadDraftFile(){
    try{ if(fs.existsSync(DRAFT_FILE)) return JSON.parse(fs.readFileSync(DRAFT_FILE,'utf8')); }catch(e){ console.error('loadDraft err', e.message) }
    return {};
}
function saveDraftFile(data){
    try{ fs.writeFileSync(DRAFT_FILE, JSON.stringify(data,null,2)); }catch(e){ console.error('saveDraft err', e.message) }
}
function parseDate(str){
    str=str.trim().replace(/\//g,'-');
    let parts=str.split('-');
    let d,m,y;
    if(parts.length===3){
        if(parts[0].length===4){ y=parseInt(parts[0]); m=parseInt(parts[1])-1; d=parseInt(parts[2]); }
        else { d=parseInt(parts[0]); m=parseInt(parts[1])-1; y=parseInt(parts[2]); if(y<100) y+=2000; }
        const date=new Date(y,m,d);
        if(isNaN(date)) return null;
        if(date.getDate()!==d || date.getMonth()!==m) return null;
        return date;
    }
    return null;
}
function toKey(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function formatIndo(date){ const months=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; return `${String(date.getDate()).padStart(2,'0')} ${months[date.getMonth()]} ${date.getFullYear()}`; }
function formatIndoFromKey(key){ const [y,m,d]=key.split('-').map(Number); return formatIndo(new Date(y,m-1,d)); }
function getAvailableDates(invData, days=60){
    const res=[]; const today=new Date(); today.setHours(0,0,0,0);
    for(let i=0;i<days;i++){
        const date=new Date(today); date.setDate(today.getDate()+i);
        const key=toKey(date);
        const count=(invData[key]||[]).length;
        if(count<3) res.push({key,date,count,free:3-count});
    }
    return res;
}

async function updateJadwalChannel(guild){
    try{
        const invData=loadInv();
        const ch=guild.channels.cache.find(c=>c.name.includes('jadwal-invitation') && c.type===ChannelType.GuildText);
        if(!ch) return;
        const today=new Date(); today.setHours(0,0,0,0);
        let desc=`**📅 AUTO ROLLING SCHEDULE - Hari ini: ${formatIndo(today)}**\nMenampilkan 30 hari ke depan!\nMax 3 undangan/hari\n\n`;
        for(let i=0;i<30;i++){
            const date=new Date(today); date.setDate(today.getDate()+i);
            const key=toKey(date);
            const list=invData[key]||[];
            desc+=`**📅 Tgl ${formatIndo(date)} (${list.length}/3)${i===0?' ⭐ HARI INI':''}**\n`;
            if(list.length===0) desc+=`-\n-\n-\n`;
            else { list.forEach((inv,idx)=>{ desc+=`${idx+1}. ${inv.jam} - **${inv.fams}**\n`; }); for(let s=list.length; s<3; s++) desc+=`-\n`; }
            desc+=`\n`;
            if(desc.length>3800) break;
        }
        const embed=new EmbedBuilder().setColor(0x00FF00).setTitle(`📅 JADWAL INVITATION - ${CONFIG.FAMS_NAME}`).setDescription(desc.substring(0,4000)).setFooter({text:`Auto rolling 30 hari • Hari ini ${formatIndo(today)}`}).setTimestamp();
        const msgs=await ch.messages.fetch({limit:15}).catch(()=>null);
        const botMsg=msgs?msgs.find(m=>m.author.id===client.user.id && m.embeds[0]?.title?.includes('JADWAL INVITATION')):null;
        if(botMsg) await botMsg.edit({embeds:[embed]}).catch(async()=>{ await ch.send({embeds:[embed]}); });
        else await ch.send({embeds:[embed]});
    }catch(e){ console.log('Jadwal err', e.message); }
}

const pendingDrafts=new Map();
function loadDraftsToMap(){
    const data = loadDraftFile();
    Object.entries(data).forEach(([k,v])=>{
        if(v.dateStr) v.dateObj = new Date(v.dateStr);
        pendingDrafts.set(k,v);
    });
    console.log(`[DRAFT] Loaded ${pendingDrafts.size} drafts`);
}
function persistDrafts(){
    const obj={};
    pendingDrafts.forEach((v,k)=>{ 
        const copy={...v};
        if(v.dateObj) copy.dateStr = v.dateObj instanceof Date ? v.dateObj.toISOString() : v.dateObj;
        delete copy.dateObj;
        obj[k]=copy;
    });
    saveDraftFile(obj);
}

async function updateMemberCount(guild){ try{ const ch=guild.channels.cache.find(c=>c.name.includes('Member:') && c.type===ChannelType.GuildVoice); if(ch) await ch.setName(`👥・Member: ${guild.memberCount}`).catch(()=>{}); }catch(e){} }

// FIX 1: Event name yang bener di discord.js v14 adalah ready / ClientReady, bukan clientReady
client.once(Events.ClientReady,()=>{
    console.log(`🦁 ${client.user.tag} ONLINE - Today ${formatIndo(new Date())}`);
    if(!fs.existsSync(INV_FILE)) saveInv(loadInv());
    loadDraftsToMap();
});
client.once('ready', ()=>{
    console.log(`[READY-LEGACY] ${client.user.tag} ready`);
});

client.on('guildMemberAdd',async(m)=>{ try{ await updateMemberCount(m.guild); }catch(e){} });
client.on('guildMemberRemove',async(m)=>{ try{ await updateMemberCount(m.guild); }catch(e){} });

client.on('interactionCreate', async (interaction)=>{
  try{
    if(interaction.isButton()){
        if(interaction.customId.startsWith('role_')){
            const target = interaction.customId.replace('role_','');
            if(!['NEWBIE','MEMBER','ELDER'].includes(target)) return;
            try{
                await interaction.guild.roles.fetch();
                const role = interaction.guild.roles.cache.find(r=>r.name===target);
                if(!role) return interaction.reply({content:`❌ Role ${target} belum ada!`, flags: MessageFlags.Ephemeral}).catch(()=>{});
                const botMember = await interaction.guild.members.fetch(client.user.id);
                if(botMember.roles.highest.position <= role.position){
                    return interaction.reply({content:`❌ Role bot gue di bawah ${target}! Naikin di Server Settings > Roles`, flags: MessageFlags.Ephemeral}).catch(()=>{});
                }
                const member = await interaction.guild.members.fetch(interaction.user.id);
                if(member.roles.cache.has(role.id)){
                    await member.roles.remove(role);
                    return interaction.reply({content:`✅ Role ${target} dilepas!`, flags: MessageFlags.Ephemeral}).catch(()=>{});
                } else {
                    await member.roles.add(role);
                    return interaction.reply({content:`✅ Role ${target} diambil!`, flags: MessageFlags.Ephemeral}).catch(()=>{});
                }
            }catch(e){
                console.error('role_ err', e);
                return interaction.reply({content:`❌ Gagal: ${e.message}`, flags: MessageFlags.Ephemeral}).catch(()=>{});
            }
        }

        const guild=interaction.guild;
        if(interaction.customId==='create_ticket'){
            // FIX 2: showModal harus langsung, jangan di-delay. Ini yang bikin "The application didn't respond"
            try{
                const modal=new ModalBuilder().setCustomId('invitation_modal').setTitle('📝 Form Undangan Event');
                const famsInput=new TextInputBuilder().setCustomId('fams').setLabel('Nama Fams Kamu').setStyle(TextInputStyle.Short).setPlaceholder('GARUDA CREW').setRequired(true).setMaxLength(50);
                const tanggalInput=new TextInputBuilder().setCustomId('tanggal').setLabel('Tanggal (DD-MM-YYYY)').setStyle(TextInputStyle.Short).setPlaceholder('05-09-2026').setRequired(true).setMaxLength(20);
                const jamInput=new TextInputBuilder().setCustomId('jam').setLabel('Jam Event').setStyle(TextInputStyle.Short).setPlaceholder('19:00 WIB').setRequired(true).setMaxLength(20);
                const jenisMapInput=new TextInputBuilder().setCustomId('jenis_map').setLabel('Jenis Event & Map').setStyle(TextInputStyle.Short).setPlaceholder('War - JAVA KOPLO').setRequired(true).setMaxLength(100);
                const kontakInput=new TextInputBuilder().setCustomId('kontak').setLabel('Kontak & Catatan').setStyle(TextInputStyle.Paragraph).setPlaceholder('Kontak: @username').setRequired(true).setMaxLength(200);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(famsInput), 
                    new ActionRowBuilder().addComponents(tanggalInput), 
                    new ActionRowBuilder().addComponents(jamInput), 
                    new ActionRowBuilder().addComponents(jenisMapInput), 
                    new ActionRowBuilder().addComponents(kontakInput)
                );
                await interaction.showModal(modal);
            }catch(e){
                console.error('create_ticket modal err', e);
                if(!interaction.replied) await interaction.reply({content:`❌ Gagal buka form: ${e.message}`, flags: MessageFlags.Ephemeral}).catch(()=>{});
            }
            return;
        }
        if(interaction.customId.startsWith('send_invitation')){
            await interaction.deferUpdate().catch(()=>{});
            const channel=interaction.channel;
            let draft=pendingDrafts.get(channel.id);
            if(!draft){
                loadDraftsToMap();
                draft=pendingDrafts.get(channel.id);
            }
            if(!draft) return interaction.followUp({content:'❌ Draft tidak ditemukan! Coba buat ticket baru di #ticket.', flags: MessageFlags.Ephemeral}).catch(()=>{});
            const invData=loadInv();
            const count=(invData[draft.key]||[]).length;
            if(count>=3){
                const avail=getAvailableDates(invData,60).filter(a=>a.free>0).slice(0,7);
                let availText=avail.map(a=>`• ${formatIndo(a.date)} (${a.free} slot)`).join('\n');
                const embedFull=new EmbedBuilder().setColor(0xFF0000).setTitle(`❌ Tanggal Full!`).setDescription(`**Tanggal ${formatIndoFromKey(draft.key)} full 3/3!**\n\nTanggal kosong terdekat:\n${availText}`).setTimestamp();
                return await channel.send({content:`<@${draft.creatorId}>`, embeds:[embedFull]}).catch(()=>{});
            }
            draft.status='waiting_admin'; pendingDrafts.set(channel.id,draft); persistDrafts();
            const waitingEmbed=new EmbedBuilder().setColor(0xFFFF00).setTitle(`⏳ MENUNGGU BALASAN ADMIN - ${draft.fams}`).setDescription(`**Mohon ditunggu, undangan kamu sedang direview ADMIN!**`).addFields({name:'📅 Tanggal',value:formatIndoFromKey(draft.key),inline:true},{name:'🕐 Jam',value:draft.jam,inline:true},{name:'🎯 Event',value:draft.jenis,inline:true}).setFooter({text:`Menunggu persetujuan...`}).setTimestamp();
            await interaction.editReply({embeds:[waitingEmbed],components:[]}).catch(()=>{});
            const adminRoles=guild.roles.cache.filter(r=>['ADMIN','HIGH RANK','CO-OWNER','OWNER'].includes(r.name));
            const adminMention=adminRoles.map(r=>`<@&${r.id}>`).join(' ');
            const adminEmbed=new EmbedBuilder().setColor(0xFFA500).setTitle(`🎫 UNDANGAN BARU - BUTUH PERSETUJUAN!`).setDescription(`Fams ${draft.fams} mengundang ${CONFIG.FAMS_NAME}!`).addFields({name:'👤 Pengirim',value:`<@${draft.creatorId}>`,inline:true},{name:'📅 Tanggal',value:`${formatIndoFromKey(draft.key)} (${count}/3)`,inline:true},{name:'🕐 Jam',value:draft.jam,inline:true},{name:'🎯 Jenis',value:draft.jenis,inline:true},{name:'🗺 Map',value:draft.map,inline:true},{name:'📞 Kontak',value:draft.kontak.substring(0,1000),inline:false}).setFooter({text:`Terima=masuk jadwal | Tolak=notif`}).setTimestamp();
            const adminRow=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`accept_invitation_${channel.id}`).setLabel('✅ Terima').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`reject_invitation_${channel.id}`).setLabel('❌ Tolak').setStyle(ButtonStyle.Danger));
            await channel.send({content:`${adminMention} - Undangan baru!`, embeds:[adminEmbed], components:[adminRow]}).catch(()=>{});
            return;
        }
        if(interaction.customId.startsWith('accept_invitation_')){
            if(interaction.replied || interaction.deferred) return;
            await interaction.deferReply().catch(()=>{ return; });
            const member=interaction.member;
            const isAdmin=member.roles.cache.some(r=>['ADMIN','HIGH RANK','CO-OWNER','OWNER'].includes(r.name)) || member.permissions.has(PermissionFlagsBits.Administrator);
            if(!isAdmin) return interaction.editReply({content:'❌ Hanya ADMIN ke atas!'}).catch(()=>{});
            const channelId=interaction.customId.replace('accept_invitation_','');
            let draft=pendingDrafts.get(channelId) || pendingDrafts.get(interaction.channel.id);
            if(!draft){ loadDraftsToMap(); draft=pendingDrafts.get(channelId) || pendingDrafts.get(interaction.channel.id); }
            if(!draft) return interaction.editReply({content:'❌ Draft tidak ditemukan! File draft hilang karena restart. Suruh user buat ulang.'}).catch(()=>{});
            const invData=loadInv();
            const count=(invData[draft.key]||[]).length;
            if(count>=3) return interaction.editReply({content:`❌ Gagal! Tanggal ${formatIndoFromKey(draft.key)} sudah full!`}).catch(()=>{});
            if(!invData[draft.key]) invData[draft.key]=[];
            invData[draft.key].push({fams:draft.fams, jam:draft.jam, jenis:draft.jenis, map:draft.map, kontak:draft.kontak, creatorId:draft.creatorId, createdAt:new Date().toISOString()});
            saveInv(invData);
            const successEmbed=new EmbedBuilder().setColor(0x00FF00).setTitle(`✅ UNDANGAN DITERIMA!`).setDescription(`Undangan **${draft.fams}** pada ${formatIndoFromKey(draft.key)} DITERIMA oleh ${member}!`).setFooter({text:`Diterima oleh ${member.displayName}`}).setTimestamp();
            await interaction.editReply({content:`<@${draft.creatorId}>`, embeds:[successEmbed]}).catch(()=>{});
            await interaction.channel.send({content:`<@${draft.creatorId}> Undangan kamu DITERIMA dan masuk jadwal!`, embeds:[successEmbed]}).catch(()=>{});
            try{ await updateJadwalChannel(guild); }catch(e){}
            pendingDrafts.delete(channelId); pendingDrafts.delete(interaction.channel.id); persistDrafts();
            setTimeout(async()=>{ try{ await interaction.channel.delete(); }catch(e){} },10000);
            return;
        }
        if(interaction.customId.startsWith('reject_invitation_')){
            const member=interaction.member;
            const isAdmin=member.roles.cache.some(r=>['ADMIN','HIGH RANK','CO-OWNER','OWNER'].includes(r.name)) || member.permissions.has(PermissionFlagsBits.Administrator);
            if(!isAdmin) return interaction.reply({content:'❌ Hanya ADMIN ke atas!', flags: MessageFlags.Ephemeral}).catch(()=>{});
            const modal=new ModalBuilder().setCustomId(`reject_modal_${interaction.channel.id}`).setTitle('❌ Tolak Undangan');
            const reasonInput=new TextInputBuilder().setCustomId('reason').setLabel('Alasan menolak').setStyle(TextInputStyle.Paragraph).setPlaceholder('Maaf tanggal tersebut ada war internal').setRequired(true).setMaxLength(500);
            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            return await interaction.showModal(modal).catch(()=>{});
        }
        if(interaction.customId==='close_ticket'){
            const isAdmin=interaction.member.roles.cache.some(r=>['ADMIN','HIGH RANK','CO-OWNER','OWNER'].includes(r.name)) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            if(!isAdmin && !interaction.channel.name.includes(interaction.user.username.toLowerCase())) {
                return interaction.reply({content:'❌ Hanya ADMIN atau pembuat ticket!', flags: MessageFlags.Ephemeral}).catch(()=>{});
            }
            await interaction.reply({content:'🔒 Closing in 5s...'}).catch(()=>{});
            setTimeout(async()=>{ try{ await interaction.channel.delete(); }catch(e){} },5000);
        }
    }
    if(interaction.isModalSubmit()){
        if(interaction.customId==='invitation_modal'){
            await interaction.deferReply({flags: MessageFlags.Ephemeral}).catch(()=>{});
            try{
                const fams=interaction.fields.getTextInputValue('fams').trim();
                const tanggalStr=interaction.fields.getTextInputValue('tanggal').trim();
                const jam=interaction.fields.getTextInputValue('jam').trim();
                const jenisMap=interaction.fields.getTextInputValue('jenis_map').trim();
                const kontak=interaction.fields.getTextInputValue('kontak').trim();
                let jenis=jenisMap; let map=CONFIG.MAP_NAME;
                if(jenisMap.includes('-')){ const parts=jenisMap.split('-'); jenis=parts[0].trim(); map=parts.slice(1).join('-').trim()||CONFIG.MAP_NAME; }
                const dateObj=parseDate(tanggalStr);
                if(!dateObj) return interaction.editReply({content:`❌ Format tanggal salah! Gunakan DD-MM-YYYY contoh: 05-09-2026`}).catch(()=>{});
                const today=new Date(); today.setHours(0,0,0,0);
                if(dateObj<today) return interaction.editReply({content:`❌ Tanggal tidak boleh di masa lalu! Hari ini ${formatIndo(today)}, kamu pilih ${formatIndo(dateObj)}`}).catch(()=>{});
                const key=toKey(dateObj);
                const invData=loadInv();
                const count=(invData[key]||[]).length;
                if(count>=3){
                    const avail=getAvailableDates(invData,60).filter(a=>a.free>0);
                    let availText=avail.slice(0,7).map(a=>`• **${formatIndo(a.date)}** - ${a.free} slot`).join('\n');
                    const embedFull=new EmbedBuilder().setColor(0xFF0000).setTitle(`❌ TANGGAL FULL!`).setDescription(`**Tanggal ${formatIndo(dateObj)} full 3/3!**\n\nTanggal kosong terdekat:\n${availText}`).setTimestamp();
                    return interaction.editReply({embeds:[embedFull]}).catch(()=>{});
                }
                const guild=interaction.guild;
                const adminRoles=guild.roles.cache.filter(r=>['ADMIN','HIGH RANK','CO-OWNER','OWNER'].includes(r.name));
                const everyone=guild.roles.everyone;
                let ticketCat=guild.channels.cache.find(c=>c.name.includes('TICKET') && c.type===ChannelType.GuildCategory);
                if(!ticketCat) ticketCat=await guild.channels.create({name:'🎫 | TICKETS', type:ChannelType.GuildCategory});
                const overwrites=[{id:everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]},{id:client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels]}];
                adminRoles.forEach(r=> overwrites.push({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}));
                const ticketChannel=await guild.channels.create({name:`🎫・ticket-${interaction.user.username.toLowerCase()}`, type:ChannelType.GuildText, parent:ticketCat.id, permissionOverwrites:overwrites});
                const draftData={fams,map,jam,jenis,kontak,key,dateObj,creatorId:interaction.user.id,creatorTag:interaction.user.tag,status:'draft', dateStr: dateObj.toISOString()};
                pendingDrafts.set(ticketChannel.id,draftData); persistDrafts();
                const draftEmbed=new EmbedBuilder().setColor(0xFFA500).setTitle(`📝 FORMAT UNDANGAN - ${fams}`).setDescription(`**Cek kembali sebelum kirim ke ADMIN!**`).addFields({name:'👥 Fams',value:fams,inline:true},{name:'📅 Tanggal',value:`${formatIndo(dateObj)} (${count}/3 → ${count+1}/3)`,inline:true},{name:'🕐 Jam',value:jam,inline:true},{name:'🎯 Jenis',value:jenis,inline:true},{name:'🗺 Map',value:map,inline:true},{name:'📞 Kontak',value:kontak.substring(0,1000),inline:false}).setFooter({text:`Jika benar, klik Kirim Undangan!`}).setTimestamp();
                const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`send_invitation_${ticketChannel.id}`).setLabel('📤 Kirim Undangan ke Admin').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Batal').setStyle(ButtonStyle.Danger));
                await ticketChannel.send({content:`<@${interaction.user.id}> - Draft:`, embeds:[draftEmbed], components:[row]}).catch(()=>{});
                await interaction.editReply({content:`✅ Form diterima! Ticket di <#${ticketChannel.id}>`}).catch(()=>{});
            }catch(e){ console.error('modal err', e); await interaction.editReply({content:`❌ Error: ${e.message}`}).catch(()=>{}); }
        }
        if(interaction.customId.startsWith('reject_modal_')){
            await interaction.deferReply().catch(()=>{});
            const channelId=interaction.customId.replace('reject_modal_','');
            const reason=interaction.fields.getTextInputValue('reason');
            const channel=interaction.guild.channels.cache.get(channelId) || interaction.channel;
            let draft=pendingDrafts.get(channelId) || pendingDrafts.get(channel.id);
            if(!draft){ loadDraftsToMap(); draft=pendingDrafts.get(channelId) || pendingDrafts.get(channel.id); }
            if(!draft) return interaction.editReply({content:'❌ Draft tidak ditemukan!'}).catch(()=>{});
            const rejectEmbed=new EmbedBuilder().setColor(0xFF0000).setTitle(`❌ UNDANGAN DITOLAK`).setDescription(`Mohon maaf <@${draft.creatorId}>, invitation anda kami tolak.`).addFields({name:'👥 Fams',value:draft.fams,inline:true},{name:'📅 Tanggal',value:formatIndoFromKey(draft.key),inline:true},{name:'📝 Alasan',value:reason,inline:false}).setFooter({text:`Ditolak oleh ${interaction.member.displayName}`}).setTimestamp();
            await channel.send({content:`<@${draft.creatorId}>`, embeds:[rejectEmbed]}).catch(()=>{});
            await interaction.editReply({content:`✅ Ditolak: ${reason}`}).catch(()=>{});
            pendingDrafts.delete(channelId); pendingDrafts.delete(channel.id); persistDrafts();
        }
    }
  }catch(err){
    console.error('[Interaction Error]', err);
    try{
        if(!interaction.replied && !interaction.deferred){
            await interaction.reply({content:'❌ Terjadi error, coba lagi!', flags: MessageFlags.Ephemeral}).catch(()=>{});
        } else {
            await interaction.followUp({content:'❌ Terjadi error, coba lagi!', flags: MessageFlags.Ephemeral}).catch(()=>{});
        }
    }catch(e){}
  }
});

client.on('messageCreate', async (message)=>{
    if(message.author.bot) return;
    const content=message.content.toLowerCase().trim();
    const args=message.content.trim().split(/ +/);
    const command=args.shift().toLowerCase();

    if(content==='!roar'){ const embed=new EmbedBuilder().setColor(0xFFA500).setTitle(`🦁 ${CONFIG.FAMS_NAME}`).setDescription(`Family resmi ${CONFIG.MAP_NAME}`).setTimestamp(); return message.reply({embeds:[embed]}); }
    if(content==='!menu'){
        const embed=new EmbedBuilder().setColor(0xFFA500).setTitle(`📜 MENU ROAR BOT`).addFields(
            {name:'🎫 Ticket',value:'`!ticket` - Buat undangan\n`!jadwal` - Liat jadwal',inline:true},
            {name:'🎭 Role',value:'`!takerole` - Ambil role',inline:true},
        ).setTimestamp();
        return message.reply({embeds:[embed]});
    }
    if(content==='!takerole'){
        const embed=new EmbedBuilder().setColor(0x00FF00).setTitle(`🎭 TAKE ROLE`).setDescription(`Klik tombol buat ambil / lepas role!`).setTimestamp();
        const row=new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('role_NEWBIE').setLabel('NEWBIE').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('role_MEMBER').setLabel('MEMBER').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('role_ELDER').setLabel('ELDER').setStyle(ButtonStyle.Success)
        );
        return message.reply({embeds:[embed], components:[row]});
    }
    if(content==='!ticket' || content==='!tiket'){
        const embed=new EmbedBuilder().setColor(0xFFA500).setTitle(`🎫 TICKET - ${CONFIG.FAMS_NAME}`).setDescription(`**Flow:**\n1. Ambil Ticket → Isi Form\n2. Kirim Undangan\n3. Mohon ditunggu\n4. Admin Terima/Tolak\n5. Diterima=masuk jadwal max 3/hari`).setTimestamp();
        const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 Ambil Ticket - Isi Form').setStyle(ButtonStyle.Success));
        return message.reply({embeds:[embed],components:[row]});
    }
    if(content==='!jadwal'){
        const invData=loadInv();
        const today=new Date(); today.setHours(0,0,0,0);
        let desc=`**📅 AUTO ROLLING 30 HARI - Hari ini: ${formatIndo(today)}**\n\n`;
        for(let i=0;i<30;i++){
            const date=new Date(today); date.setDate(today.getDate()+i);
            const key=toKey(date);
            const list=invData[key]||[];
            desc+=`**📅 Tgl ${formatIndo(date)} (${list.length}/3)**\n`;
            if(list.length===0) desc+=`-\n-\n-\n`;
            else { list.forEach((inv,idx)=>{ desc+=`${idx+1}. ${inv.jam} - ${inv.fams}\n`; }); }
            desc+=`\n`;
            if(desc.length>3800) break;
        }
        const embed=new EmbedBuilder().setColor(0x00FF00).setTitle(`📅 JADWAL AUTO ROLLING 30 HARI`).setDescription(desc.substring(0,4000)).setTimestamp();
        return message.reply({embeds:[embed]});
    }
});

const token = process.env.DISCORD_TOKEN;
if(!token){
    console.error('❌ DISCORD_TOKEN tidak ada di .env! Bot gak akan online.');
} else {
    client.login(token).then(()=>console.log('Login attempt...')).catch(e=>console.error('Login failed:', e.message));
}
