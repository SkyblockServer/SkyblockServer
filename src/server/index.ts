import { WebSocketServer } from 'ws';
import Logger from '../classes/Logger';
import Socket, { CloseCodes } from './Socket';

export let wss: WebSocketServer;
export const connections: Map<string, Socket> = new Map();

const logger = new Logger('Server');

export function initServer(server) {
  wss = new WebSocketServer({
    server,
    path: '/server',
  });

  wss.on('connection', (ws, req) => {
    // Resuming
    if (req.headers['session-id']) {
      // Get the socket
      const session = (req.headers['session-id'] as string).trim?.();
      const lastSeq = Number(req.headers['seq'] as string);
      const con = connections.get(session);

      // If its a valid ID and if the socket isn't connected elsewhere
      if (con && !con.connected) con.connect(ws, true, lastSeq);
      // Not a valid ID
      else if (!con) return ws.close(CloseCodes.RESUME_FAILED, 'Invalid Session ID');
      // Already connected
      else return ws.close(CloseCodes.RESUME_FAILED, 'Session is already connected somewhere else!');
    }
    // Identify
    else new Socket().connect(ws, false);
  });
}
