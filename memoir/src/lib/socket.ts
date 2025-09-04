// lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
export const getSocket = () => {
  if (!socket) socket = io(); // or io(process.env.NEXT_PUBLIC_WS_URL!)
  return socket;
};
