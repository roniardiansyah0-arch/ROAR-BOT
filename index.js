const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end('ROAR BOT DEBUG - '+new Date().toISOString()+' - TOKEN_EXISTS:'+!!process.env.DISCORD_TOKEN);
}).listen(PORT, ()=>console.log(`[WEB] Listening on ${PORT}`));

console.log('[DEBUG] ENV CHECK - DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
console.log('[DEBUG] ENV CHECK - DISCORD_TOKEN length:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);
console.log('[DEBUG] ENV CHECK - PORT:', process.env.PORT);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.once(Events.ClientReady,()=>{
    console.log(`🦁 ${client.user.tag} ONLINE - SUCCESS!`);
});

const token = process.env.DISCORD_TOKEN;
if(!token){
    console.error('❌ DISCORD_TOKEN TIDAK ADA! Set di Render > Environment > DISCORD_TOKEN');
} else {
    console.log('Attempting login...');
    client.login(token).then(()=>console.log('Login attempt sent...')).catch(e=>console.error('Login failed:', e.message, e.code));
}
