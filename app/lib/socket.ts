import { io } from 'socket.io-client';

// For development, you might explicitly use: const SOCKET_URL = 'http://localhost:3000';
// For production, this would be your deployed server URL.
// Using io() without arguments defaults to the current host and port, which should work with the custom server.
const socket = io();

export default socket; 