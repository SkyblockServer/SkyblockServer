import { WebSocketServer } from 'ws';
import Logger from '../classes/Logger';
import Connection, { CloseCodes } from './Connection';

export let wss: WebSocketServer;
export const connections: Map<string, Connection> = new Map();

const logger = new Logger('Server');

export function initServer(server) {
  wss = new WebSocketServer({
    server,
    path: '/server',
  });

  wss.on('connection', (ws, req) => {
    // Resuming
    if (req.headers['session-id']) {
      // Get the connection
      const session = (req.headers['session-id'] as string).trim?.();
      const lastSeq = Number(req.headers['seq'] as string);
      const con = connections.get(session);

      // If its a valid ID and if the connection isn't connected to another socket
      if (con && !con.connected) con.connect(ws, true, lastSeq);
      // Not a valid ID
      else if (!con) return ws.close(CloseCodes.RESUME_FAILED, 'Invalid Session ID');
      // Already connected
      else return ws.close(CloseCodes.RESUME_FAILED, 'Session is already connected somewhere else!');
    }
    // Identify
    else new Connection().connect(ws, false);
  });
}
