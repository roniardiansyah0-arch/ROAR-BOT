const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end('DIAG - '+new Date().toISOString()+' - TOKEN:'+(!!process.env.DISCORD_TOKEN));
}).listen(PORT, ()=>console.log(`[WEB] Listening on ${PORT}`));

console.log('[CHECK] TOKEN exists:', !!process.env.DISCORD_TOKEN);
console.log('[CHECK] TOKEN length:', process.env.DISCORD_TOKEN?.length);
console.log('[CHECK] TOKEN first 10 chars:', process.env.DISCORD_TOKEN?.substring(0,10));
console.log('[CHECK] TOKEN has spaces/newline:', /\s/.test(process.env.DISCORD_TOKEN||''));

const token = (process.env.DISCORD_TOKEN||'').trim();

async function testToken(){
  try{
    console.log('[TEST] Testing token via Discord API...');
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` }
    });
    console.log('[TEST] API status:', res.status, res.statusText);
    const data = await res.json().catch(()=>({}));
    console.log('[TEST] API response:', JSON.stringify(data).substring(0,200));
    if(res.status===200){
      console.log(`[TEST] TOKEN VALID! Bot user: ${data.username}#${data.discriminator} ID:${data.id}`);
    } else if(res.status===401){
      console.error('[TEST] TOKEN INVALID - 401 Unauthorized! Harus Reset Token lagi di Discord Developer Portal');
    } else {
      console.error('[TEST] Unexpected status');
    }
  }catch(e){
    console.error('[TEST] Fetch error:', e.message);
  }
}

testToken().then(()=>{
  console.log('[LOGIN] Now trying client.login...');
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
  client.on(Events.Debug, m=>console.log('[DEBUG]', m));
  client.on(Events.Error, e=>console.error('[CLIENT ERROR]', e));
  client.on(Events.ShardError, e=>console.error('[SHARD ERROR]', e));
  client.once(Events.ClientReady, ()=>{ console.log(`🦁 ${client.user.tag} ONLINE - SUCCESS!`); });
  client.login(token).then(()=>console.log('[LOGIN] login() promise resolved')).catch(e=>console.error('[LOGIN] login() failed:', e.message, e.code, e.status));
});
