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

const userSocketMap = {};
const matchSocketMap = {}; // Maps userId to socket.id for the /match namespace
const matchmakingQueue = []; // Simple queue for demonstration

// New: Store active matches by matchId for easy lookup
const activeMatches = {}; // matchId -> { player1Id, player2Id }

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

            // Store active match info
            activeMatches[matchId] = { player1Id, player2Id };
            console.log("Active Matches:", activeMatches);

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

    // --- New: Listener for when a player wins ---
    socket.on("player_wins", ({ matchId, winnerId }) => {
        console.log(`Player ${winnerId} declared win for match ${matchId}.`);

        const matchInfo = activeMatches[matchId];
        if (matchInfo) {
            const loserId = (winnerId === matchInfo.player1Id) ? matchInfo.player2Id : matchInfo.player1Id;

            // Notify both players in the match that the game has ended
            if (matchSocketMap[winnerId]) {
                matchIo.to(matchSocketMap[winnerId]).emit("game_ended", { matchId, winnerId, loserId });
            }
            if (matchSocketMap[loserId]) {
                matchIo.to(matchSocketMap[loserId]).emit("game_ended", { matchId, winnerId, loserId });
            }

            // Clean up the active match
            delete activeMatches[matchId];
            console.log(`Match ${matchId} ended and removed from active matches.`);
        } else {
            console.warn(`player_wins event for unknown or already ended match: ${matchId}`);
        }
    });

    socket.on("disconnect", (reason) => {
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

        // Also handle if a player disconnects mid-game
        for (const mId in activeMatches) {
            const match = activeMatches[mId];
            if (match.player1Id === userId || match.player2Id === userId) {
                const opponentId = (match.player1Id === userId) ? match.player2Id : match.player1Id;
                if (matchSocketMap[opponentId]) {
                    matchIo.to(matchSocketMap[opponentId]).emit("game_ended", {
                        matchId: mId,
                        winnerId: opponentId, // Opponent wins by default
                        loserId: userId,
                        reason: "opponent_disconnected"
                    });
                }
                delete activeMatches[mId];
                console.log(`Match ${mId} ended due to ${userId} disconnect.`);
                break;
            }
        }
    });
});

export { io, app, server };