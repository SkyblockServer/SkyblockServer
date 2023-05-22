import { WebSocketServer } from 'ws';

export let wss: WebSocketServer;

export function initServer(server) {
  wss = new WebSocketServer({
    server,
    path: '/server',
  });

  wss.on('connection', socket => {
    socket.close(4000, 'WIP Feature');
  });
}
