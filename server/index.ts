import {createServer} from 'node:http';
import {Server} from 'socket.io';
// Experimental authoritative movement server. Not yet connected to the offline client.
const http=createServer((_,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',protocol:1,mode:'experimental'}))});
const io=new Server(http,{maxHttpBufferSize:4096,connectTimeout:10000});
type Player={x:number;z:number;dx:number;dz:number;room:string;last:number};
const players=new Map<string,Player>();
io.on('connection',socket=>{
 if(players.size>=64){socket.disconnect(true);return}
 const p:Player={x:44,z:65,dx:0,dz:0,room:'public',last:0};players.set(socket.id,p);socket.join('public');
 socket.on('join',(room:unknown)=>{if(typeof room!=='string'||!/^[-a-zA-Z0-9]{1,20}$/.test(room))return;socket.leave(p.room);p.room=room;socket.join(room)});
 socket.on('input',(data:unknown)=>{const now=Date.now();if(now-p.last<25||!data||typeof data!=='object')return;const d=data as {x:unknown;z:unknown};if(typeof d.x!=='number'||typeof d.z!=='number'||!Number.isFinite(d.x)||!Number.isFinite(d.z))return;p.last=now;const len=Math.max(1,Math.hypot(d.x,d.z));p.dx=d.x/len;p.dz=d.z/len});
 socket.on('disconnect',()=>players.delete(socket.id));
});
setInterval(()=>{const rooms=new Set<string>();for(const p of players.values()){if(Date.now()-p.last>500){p.dx=0;p.dz=0}p.x=Math.max(-145,Math.min(75,p.x+p.dx*.2));p.z=Math.max(-280,Math.min(280,p.z+p.dz*.2));rooms.add(p.room)}for(const room of rooms)io.to(room).emit('snapshot',{time:Date.now(),players:[...players].filter(([,p])=>p.room===room).map(([id,p])=>({id,x:p.x,z:p.z}))})},50);
http.listen(Number(process.env.PORT)||3001,'0.0.0.0',()=>console.log('Experimental world server on 0.0.0.0:3001'));
