import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"],
    },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

const userSocketMap = {}; // Maps userId to socket.id for the main namespace
const matchSocketMap = {}; // Maps userId to socket.id for the /match namespace
const matchmakingQueue = []; // Simple queue for demonstration

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        console.log("A user disconnected", userSocketMap);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

const matchIo = io.of("/match");
matchIo.on("connection", (socket) => {
    // FIX: Combined duplicate log and added userId for clarity
    const userId = socket.handshake.query.userId;
    console.log(`Match: A user connected. userId: ${userId || 'N/A'}, Socket ID: ${socket.id}`);

    if (userId) matchSocketMap[userId] = socket.id;

    socket.on("start_matchmaking", () => {
        console.log(`User ${userId || 'N/A'} requested to start matchmaking.`);
        if (userId && !matchmakingQueue.includes(userId)) {
            matchmakingQueue.push(userId);
            console.log("Current matchmaking queue:", matchmakingQueue);
        }

        if (matchmakingQueue.length >= 2) {
            const player1Id = matchmakingQueue.shift();
            const player2Id = matchmakingQueue.shift();
            const matchId = `match_${Date.now()}`;

            console.log(`Match found: ${matchId} between ${player1Id} and ${player2Id}`);

            // Notify players in the /match namespace that a match is found
            if (matchSocketMap[player1Id]) {
                matchIo.to(matchSocketMap[player1Id]).emit("match_found", { matchId, opponentId: player2Id });
            }
            if (matchSocketMap[player2Id]) {
                matchIo.to(matchSocketMap[player2Id]).emit("match_found", { matchId, opponentId: player1Id });
            }
        }
    });

    socket.on("stop_matchmaking", () => {
        console.log(`User ${userId || 'N/A'} requested to stop matchmaking.`);
        const index = matchmakingQueue.indexOf(userId);
        if (index > -1) {
            matchmakingQueue.splice(index, 1);
            console.log("Current matchmaking queue:", matchmakingQueue);
        }
    });

    socket.on("disconnect", (reason) => {
        // FIX: More robust cleanup for matchSocketMap
        console.log(`Match: User disconnected. userId: ${userId || 'N/A'}, Socket ID: ${socket.id}, Reason: ${reason}`);

        if (userId && matchSocketMap[userId] === socket.id) {
            delete matchSocketMap[userId];
            console.log(`Match: User ${userId} removed from matchSocketMap.`);
        } else if (userId) {
            console.log(`Match: User ${userId} (${socket.id}) disconnected, but was not the primary socket in map. Not deleting.`);
        }

        const queueIndex = matchmakingQueue.indexOf(userId);
        if (queueIndex > -1) {
            matchmakingQueue.splice(queueIndex, 1);
            console.log("User removed from queue due to disconnect. Current queue:", matchmakingQueue);
        }
    });
});

export { io, app, server };