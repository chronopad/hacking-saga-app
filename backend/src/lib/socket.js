import { Server } from "socket.io";
import http from "http";
import express from "express";
import fs from "fs/promises";
import path from "path";

const app = express();
const server = http.createServer(app);

const userSocketMap = {};
const matchSocketMap = {};
const matchmakingQueue = [];
const activeMatches = {};
const matchChallenges = {};

const CHALLENGES_BASE_PATH = path.join(process.cwd(), "challenges");

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"],
    },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// Function to get a random challenge from the local directory
// Now fetches flag.txt and lists other relevant files
async function getRandomChallenge() {
    try {
        const challengeDirs = await fs.readdir(CHALLENGES_BASE_PATH, { withFileTypes: true });
        const directories = challengeDirs.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

        if (directories.length === 0) {
            console.error("No challenge directories found in:", CHALLENGES_BASE_PATH);
            return null;
        }

        const randomDir = directories[Math.floor(Math.random() * directories.length)];
        const challengePath = path.join(CHALLENGES_BASE_PATH, randomDir);

        let flagTxt;
        try {
            flagTxt = await fs.readFile(path.join(challengePath, 'flag.txt'), 'utf8');
        } catch (readError) {
            console.error(`Error reading flag.txt from ${path.join(challengePath, 'flag.txt')}:`, readError.message);
            return null;
        }

        // --- NEW LOGIC: List other files ---
        const filesInChallenge = await fs.readdir(challengePath, { withFileTypes: true });
        const relevantFiles = filesInChallenge
            .filter(dirent => dirent.isFile()) // Only consider files
            .map(dirent => dirent.name) // Get their names
            .filter(name =>
                name !== 'flag.txt' &&     // Exclude flag.txt
                !name.startsWith('solve.') // Exclude files starting with 'solve.'
            );
        // --- END NEW LOGIC ---

        console.log(`Fetched challenge: ${randomDir}`);
        console.log(`Correct Flag (backend console): ${flagTxt.trim()}`);
        console.log(`Relevant Challenge Files for players:`, relevantFiles);

        return {
            name: randomDir,
            flag: flagTxt.trim(),
            // --- NEW: Send relevant file names to frontend ---
            challengeFiles: relevantFiles
            // --- END NEW ---
        };
    } catch (error) {
        console.error("Error fetching random challenge from local directory:", error);
        return null;
    }
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

    socket.on("start_matchmaking", async () => {
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

                const challenge = await getRandomChallenge();
                if (!challenge) {
                    console.error("Failed to get a challenge. Cannot start match.");
                    matchmakingQueue.push(player1Id, player2Id);
                    return;
                }

                console.log(`Matchmaking: Found match ${matchId} between ${player1Id} and ${player2Id}.`);

                activeMatches[matchId] = { player1Id, player2Id };
                matchChallenges[matchId] = challenge;

                // --- MODIFIED: Pass challengeFiles to frontend ---
                if (matchSocketMap[player1Id]) {
                    matchIo.to(matchSocketMap[player1Id]).emit("match_found", {
                        matchId,
                        opponentId: player2Id,
                        challengeOutput: undefined, // Still no direct output.txt content
                        challengeFiles: challenge.challengeFiles // NEW: Pass the list of files
                    });
                } else {
                    console.warn(`Matchmaking: Player1 ${player1Id} not found in map, cannot notify.`);
                }
                if (matchSocketMap[player2Id]) {
                    matchIo.to(matchSocketMap[player2Id]).emit("match_found", {
                        matchId,
                        opponentId: player1Id,
                        challengeOutput: undefined, // Still no direct output.txt content
                        challengeFiles: challenge.challengeFiles // NEW: Pass the list of files
                    });
                } else {
                    console.warn(`Matchmaking: Player2 ${player2Id} not found in map, cannot notify.`);
                }
                // --- END MODIFIED ---
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

    socket.on("submit_flag", ({ matchId, submittedFlag }) => {
        console.log(`Flag Submission: User ${userId} submitted flag '${submittedFlag}' for match ${matchId}.`);

        const matchInfo = activeMatches[matchId];
        const challengeInfo = matchChallenges[matchId];

        if (!matchInfo || !challengeInfo) {
            console.warn(`Flag Submission: Invalid match ${matchId} or missing challenge data for user ${userId}.`);
            socket.emit("flag_submission_result", { success: false, message: "Invalid match or challenge data." });
            return;
        }

        if (!activeMatches[matchId].player1Id || !activeMatches[matchId].player2Id) {
             console.log(`Flag Submission: Game ${matchId} seems to have already concluded. Rejecting submission from ${userId}.`);
             socket.emit("flag_submission_result", { success: false, message: "Game has already concluded." });
             return;
        }

        if (submittedFlag.trim() === challengeInfo.flag) {
            console.log(`Flag Submission: Correct flag submitted by ${userId} for match ${matchId}!`);
            const winnerId = userId;
            const loserId = (userId === matchInfo.player1Id) ? matchInfo.player2Id : matchInfo.player1Id;

            if (matchSocketMap[winnerId]) {
                matchIo.to(matchSocketMap[winnerId]).emit("game_ended", { matchId, winnerId, loserId, reason: "correct_flag" });
            }
            if (matchSocketMap[loserId]) {
                matchIo.to(matchSocketMap[loserId]).emit("game_ended", { matchId, winnerId, loserId, reason: "correct_flag" });
            }

            delete activeMatches[matchId];
            delete matchChallenges[matchId];
            console.log(`Game End: Match ${matchId} ended due to correct flag submission.`);
        } else {
            console.log(`Flag Submission: Incorrect flag submitted by ${userId} for match ${matchId}.`);
            socket.emit("flag_submission_result", { success: false, message: "Incorrect flag. Try again!" });
        }
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
                delete matchChallenges[mId];
                console.log(`Game End: Match ${mId} ended due to ${userId} disconnect.`);
                break;
            }
        }
    });
});

export { io, app, server };