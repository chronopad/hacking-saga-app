import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const userSocketMap = {};
const matchSocketMap = {};
const matchmakingQueue = [];
const activeMatches = {};

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"],
    },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`Socket Connected (Default): ID=${socket.id}, UserID=${userId || 'N/A'}`);

    if (userId) {
        if (userSocketMap[userId] && userSocketMap[userId] !== socket.id) {
            const oldSocket = io.sockets.sockets.get(userSocketMap[userId]);
            if (oldSocket) {
                console.log(`Default Socket Cleanup: Disconnecting old socket ${userSocketMap[userId]} for user ${userId}.`);
                oldSocket.disconnect(true);
            }
        }
        userSocketMap[userId] = socket.id;
    } else {
        console.warn(`Default Socket: Connected socket ${socket.id} has no userId.`);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", (reason) => {
        console.log(`Socket Disconnected (Default): ID=${socket.id}, UserID=${userId || 'N/A'}, Reason=${reason}`);
        if (userId && userSocketMap[userId] === socket.id) {
            delete userSocketMap[userId];
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

const matchIo = io.of("/match");
matchIo.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`Socket Connected (Match): ID=${socket.id}, UserID=${userId || 'N/A'}`);

    if (!userId) {
        console.warn(`Match Socket: Connected socket ${socket.id} has no userId. Disconnecting.`);
        socket.disconnect(true);
        return;
    }

    if (matchSocketMap[userId] && matchSocketMap[userId] !== socket.id) {
        const oldSocket = matchIo.sockets.get(matchSocketMap[userId]);
        if (oldSocket) {
            console.log(`Match Socket Cleanup: Disconnecting old socket ${matchSocketMap[userId]} for user ${userId}.`);
            oldSocket.disconnect(true);
        }
    }
    matchSocketMap[userId] = socket.id;

    socket.on("start_matchmaking", () => {
        console.log(`Matchmaking: User ${userId} requested to start matchmaking.`);
        try {
            if (matchmakingQueue.includes(userId)) {
                console.log(`Matchmaking: User ${userId} already in queue.`);
                return;
            }

            matchmakingQueue.push(userId);
            console.log(`Matchmaking: User ${userId} added to queue. Current queue: ${matchmakingQueue.length} players.`);

            if (matchmakingQueue.length >= 2) {
                const player1Id = matchmakingQueue.shift();
                const player2Id = matchmakingQueue.shift();
                const matchId = `match_${Date.now()}`;

                console.log(`Matchmaking: Found match ${matchId} between ${player1Id} and ${player2Id}.`);

                activeMatches[matchId] = { player1Id, player2Id };

                if (matchSocketMap[player1Id]) {
                    matchIo.to(matchSocketMap[player1Id]).emit("match_found", { matchId, opponentId: player2Id });
                } else {
                    console.warn(`Matchmaking: Player1 ${player1Id} not found in map, cannot notify.`);
                }
                if (matchSocketMap[player2Id]) {
                    matchIo.to(matchSocketMap[player2Id]).emit("match_found", { matchId, opponentId: player1Id });
                } else {
                    console.warn(`Matchmaking: Player2 ${player2Id} not found in map, cannot notify.`);
                }
            }
        } catch (error) {
            console.error(`Matchmaking Error: Failed to start matchmaking for user ${userId}:`, error);
        }
    });

    socket.on("stop_matchmaking", () => {
        console.log(`Matchmaking: User ${userId} requested to stop matchmaking.`);
        const index = matchmakingQueue.indexOf(userId);
        if (index > -1) {
            matchmakingQueue.splice(index, 1);
            console.log(`Matchmaking: User ${userId} removed from queue. Current queue: ${matchmakingQueue.length} players.`);
        } else {
            console.log(`Matchmaking: User ${userId} was not in queue.`);
        }
    });

    socket.on("player_wins", ({ matchId, winnerId }) => {
        console.log(`Game End: Player ${winnerId} declared win for match ${matchId}.`);

        const matchInfo = activeMatches[matchId];
        if (!matchInfo) {
            console.warn(`Game End: player_wins event for unknown or already ended match: ${matchId}.`);
            return;
        }

        const loserId = (winnerId === matchInfo.player1Id) ? matchInfo.player2Id : matchInfo.player1Id;

        if (matchSocketMap[winnerId]) {
            matchIo.to(matchSocketMap[winnerId]).emit("game_ended", { matchId, winnerId, loserId });
        }
        if (matchSocketMap[loserId]) {
            matchIo.to(matchSocketMap[loserId]).emit("game_ended", { matchId, winnerId, loserId });
        }

        delete activeMatches[matchId];
        console.log(`Game End: Match ${matchId} removed from active matches.`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`Socket Disconnected (Match): ID=${socket.id}, UserID=${userId || 'N/A'}, Reason=${reason}`);

        if (userId && matchSocketMap[userId] === socket.id) {
            delete matchSocketMap[userId];
        }

        const queueIndex = matchmakingQueue.indexOf(userId);
        if (queueIndex > -1) {
            matchmakingQueue.splice(queueIndex, 1);
            console.log(`Matchmaking: User ${userId} removed from queue due to disconnect.`);
        }

        for (const mId in activeMatches) {
            const match = activeMatches[mId];
            if (match.player1Id === userId || match.player2Id === userId) {
                const opponentId = (match.player1Id === userId) ? match.player2Id : match.player1Id;
                if (matchSocketMap[opponentId]) {
                    matchIo.to(matchSocketMap[opponentId]).emit("game_ended", {
                        matchId: mId,
                        winnerId: opponentId,
                        loserId: userId,
                        reason: "opponent_disconnected"
                    });
                }
                delete activeMatches[mId];
                console.log(`Game End: Match ${mId} ended due to ${userId} disconnect.`);
                break;
            }
        }
    });
});

export { io, app, server };