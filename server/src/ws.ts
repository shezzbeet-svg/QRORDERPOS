import { Server } from 'socket.io';

export let io: Server;

export function init(server: any) {
  io = new Server(server, { cors: { origin: '*' } });
  io.on('connection', socket => {
    console.log('socket connected', socket.id);
  });
  return io;
}
