"use strict";
//import { Server } from "socket.io";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Import required modules
// Web framework for Node.js
const express = require('express');
// Create HTTP server
const { createServer } = require('node:http');
// Join file paths
const { join } = require('node:path');
// WebSocket server
const { Server } = require('socket.io');
// SQLite database engine
const sqlite3 = require('sqlite3');
// Promise-based wrapper for sqlite3
const { open } = require('sqlite');
// Main async function to set up server and database
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Open a SQLite database file (creates it if it doesn't exist)
        const db = yield open({
            filename: 'chatOne.db',
            driver: sqlite3.Database
        });
        // Create a messages table if it doesnt already exist
        yield db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);
        // Set up express app and HTTP server
        const app = express();
        const server = createServer(app);
        // Create a Socket.IO server with connection state and recover enabled
        const io = new Server(server, {
            //Enables recovery of missed events
            connectionStateRecovery: {}
        });
        // Serve the chat frontend (index.html) at the root URL
        app.get('/', (req, res) => {
            res.sendFile(join(__dirname, 'index.html'));
        });
        // Handle WebSocket connections
        io.on('connection', (socket) => __awaiter(this, void 0, void 0, function* () {
            // Listen for 'chat message' events from clients
            socket.on('chat message', (msg, clientOffset, callback) => __awaiter(this, void 0, void 0, function* () {
                let result;
                try {
                    // Try inserting the new message into database
                    result = yield db.run('INSERT INTO messages (content, client_offset) VALUES (?, ?)', msg, clientOffset);
                }
                catch (e) {
                    // Handle duplicate clientOffset errors (message already inserted)
                    if (e.errno === 19 /* SQLITE_CONSTRAINT */) {
                        // Acnowledge but do not re-broadcast
                        callback();
                    }
                    else {
                        // Other errors are ignored to let client re-entry
                    }
                    return;
                }
                // Broadcast the messaage to all connected clients
                io.emit('chat message', msg, result.lastID);
                //callback();
            }));
            //If this is a new connection (not recovered), send missed messages
            if (!socket.recovered) {
                try {
                    yield db.each('SELECT id, content FROM messages WHERE id > ?', [socket.handshake.auth.serverOffset || 0], (_err, row) => {
                        // Send each missed message back to the client
                        socket.emit('chat message', row.content, row.id);
                    });
                }
                catch (e) {
                    // Log or handle DB error if needed
                }
            }
        }));
        // Start the server on port 3000
        // Want to see if we can change link name??
        server.listen(3000, () => {
            console.log('server running at http://localhost:3000');
        });
    });
}
// run main function
main();
//# sourceMappingURL=index.js.map