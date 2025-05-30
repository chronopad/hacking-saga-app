import { Server } from "socket.io";
import http from "http";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from 'cloudinary'; // Import Cloudinary
import dotenv from 'dotenv'; // To load .env variables

dotenv.config(); // Load .env variables

const app = express();
const server = http.createServer(app);

// --- Cloudinary Configuration ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Ensures HTTPS URLs are generated
});
// --- End Cloudinary Configuration ---


const userSocketMap = {};
const matchSocketMap = {};
const matchmakingQueue = [];
const activeMatches = {};
const matchChallenges = {}; // Will store { name, flag, challengeFileDetails (from Cloudinary) }

const CHALLENGES_BASE_PATH = path.join(process.cwd(), "challenges");

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"], // Your frontend URL
    },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// Function to get local challenge details
async function getLocalChallengeDetails() {
    try {
        const challengeDirs = await fs.readdir(CHALLENGES_BASE_PATH, { withFileTypes: true });
        const directories = challengeDirs.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

        if (directories.length === 0) {
            console.error("No challenge directories found in:", CHALLENGES_BASE_PATH);
            return null;
        }

        const randomDirName = directories[Math.floor(Math.random() * directories.length)];
        const challengePath = path.join(CHALLENGES_BASE_PATH, randomDirName);

        let flagTxt;
        try {
            flagTxt = await fs.readFile(path.join(challengePath, 'flag.txt'), 'utf8');
        } catch (readError) {
            console.error(`Error reading flag.txt from ${path.join(challengePath, 'flag.txt')}:`, readError.message);
            return null;
        }

        const filesInChallenge = await fs.readdir(challengePath, { withFileTypes: true });
        const relevantLocalFiles = filesInChallenge
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name)
            .filter(name => name !== 'flag.txt' && !name.startsWith('solve.'));

        console.log(`Selected local challenge: ${randomDirName}`);
        console.log(`Correct Flag (for selected challenge): ${flagTxt.trim()}`);
        console.log(`Relevant local challenge files:`, relevantLocalFiles);

        return {
            name: randomDirName, // Directory name of the challenge
            flag: flagTxt.trim(),
            localChallengeFiles: relevantLocalFiles // Array of local file names
        };
    } catch (error) {
        console.error("Error fetching random local challenge details:", error);
        return null;
    }
}

// Function to upload files to Cloudinary
async function uploadFilesToCloudinary(challengeDirName, localFileNames, matchId) {
    const uploadedFileDetails = [];
    const challengeSourcePath = path.join(CHALLENGES_BASE_PATH, challengeDirName);

    for (const fileName of localFileNames) {
        const localFilePath = path.join(challengeSourcePath, fileName);
        try {
            const safeFileNameForPublicId = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
            const result = await cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto",
                folder: `ctf_matches/${matchId}`,
                public_id: safeFileNameForPublicId,
                overwrite: true,
            });
            uploadedFileDetails.push({
                fileName: fileName, // Original file name for display
                url: result.secure_url,
                publicId: result.public_id,
                type: result.resource_type,
            });
            console.log(`Successfully uploaded ${fileName} for match ${matchId} to ${result.secure_url}`);
        } catch (error) {
            console.error(`Error uploading ${fileName} for match ${matchId} to Cloudinary:`, error);
            uploadedFileDetails.push({
                fileName: fileName,
                url: null,
                error: "Upload failed",
            });
        }
    }
    return uploadedFileDetails;
}


// Default namespace for general user presence
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

// Match namespace for game logic
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
                socket.emit("matchmaking_status", { message: "You are already in the queue." });
                return;
            }
            matchmakingQueue.push(userId);
            socket.emit("matchmaking_status", { message: "You have joined the matchmaking queue." });
            console.log(`Matchmaking: User ${userId} added to queue. Current queue: ${matchmakingQueue.length} players.`);

            if (matchmakingQueue.length >= 2) {
                const player1Id = matchmakingQueue.shift();
                const player2Id = matchmakingQueue.shift();
                const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                const localChallenge = await getLocalChallengeDetails();
                if (!localChallenge) {
                    console.error(`Matchmaking Error: Failed to get local challenge details for match ${matchId}.`);
                    matchmakingQueue.unshift(player2Id); 
                    matchmakingQueue.unshift(player1Id);
                    const errorMsg = "Error finding a challenge. Please try again.";
                    if (matchSocketMap[player1Id]) matchIo.to(matchSocketMap[player1Id]).emit("matchmaking_error", { message: errorMsg });
                    if (matchSocketMap[player2Id]) matchIo.to(matchSocketMap[player2Id]).emit("matchmaking_error", { message: errorMsg });
                    return;
                }

                let uploadedChallengeFiles = [];
                if (localChallenge.localChallengeFiles && localChallenge.localChallengeFiles.length > 0) {
                    console.log(`Matchmaking: Uploading ${localChallenge.localChallengeFiles.length} files for challenge '${localChallenge.name}' for match ${matchId}`);
                    uploadedChallengeFiles = await uploadFilesToCloudinary(
                        localChallenge.name,
                        localChallenge.localChallengeFiles,
                        matchId
                    );

                    const failedUploads = uploadedChallengeFiles.filter(f => !f.url);
                    if (failedUploads.length > 0) {
                        console.error(`Matchmaking: Failed to upload ${failedUploads.length} file(s) for match ${matchId}. Aborting match.`);
                        // TODO: Consider deleting successfully uploaded files for this match from Cloudinary to clean up.
                        matchmakingQueue.unshift(player2Id);
                        matchmakingQueue.unshift(player1Id);
                        const errorMsg = "Error preparing challenge resources. Some files could not be made available. Please try again.";
                        if (matchSocketMap[player1Id]) matchIo.to(matchSocketMap[player1Id]).emit("matchmaking_error", { message: errorMsg });
                        if (matchSocketMap[player2Id]) matchIo.to(matchSocketMap[player2Id]).emit("matchmaking_error", { message: errorMsg });
                        return;
                    }
                } else {
                    console.log(`Matchmaking: No additional files to upload for challenge '${localChallenge.name}' for match ${matchId}`);
                }

                console.log(`Matchmaking: Found match ${matchId} between ${player1Id} and ${player2Id}.`);
                activeMatches[matchId] = { player1Id, player2Id };
                matchChallenges[matchId] = {
                    name: localChallenge.name,
                    flag: localChallenge.flag,
                    challengeFileDetails: uploadedChallengeFiles // Store full details from Cloudinary
                };

                // Prepare payload for clients (only fileName and url)
                const clientFilePayload = uploadedChallengeFiles.map(f => ({ fileName: f.fileName, url: f.url }));

                const P1_Payload = { matchId, opponentId: player2Id, challengeOutput: undefined, challengeFiles: clientFilePayload };
                const P2_Payload = { matchId, opponentId: player1Id, challengeOutput: undefined, challengeFiles: clientFilePayload };

                if (matchSocketMap[player1Id]) {
                    matchIo.to(matchSocketMap[player1Id]).emit("match_found", P1_Payload);
                } else {
                    console.warn(`Matchmaking: Player1 ${player1Id} not found in map, cannot notify.`);
                }
                if (matchSocketMap[player2Id]) {
                    matchIo.to(matchSocketMap[player2Id]).emit("match_found", P2_Payload);
                } else {
                    console.warn(`Matchmaking: Player2 ${player2Id} not found in map, cannot notify.`);
                }
            }
        } catch (error) {
            console.error(`Matchmaking Error for user ${userId}:`, error);
            socket.emit("matchmaking_error", { message: "An unexpected error occurred. Please try again." });
        }
    });

    socket.on("stop_matchmaking", () => {
        console.log(`Matchmaking: User ${userId} requested to stop matchmaking.`);
        const index = matchmakingQueue.indexOf(userId);
        if (index > -1) {
            matchmakingQueue.splice(index, 1);
            socket.emit("matchmaking_status", { message: "You have left the matchmaking queue." });
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

        // Check if match is still active (i.e., players haven't been cleared)
        if (!matchInfo.player1Id || !matchInfo.player2Id) {
             console.log(`Flag Submission: Game ${matchId} seems to have already concluded. Rejecting submission from ${userId}.`);
             socket.emit("flag_submission_result", { success: false, message: "Game has already concluded." });
             return;
        }

        if (submittedFlag.trim() === challengeInfo.flag) {
            console.log(`Flag Submission: Correct flag submitted by ${userId} for match ${matchId}!`);
            const winnerId = userId;
            const loserId = (userId === matchInfo.player1Id) ? matchInfo.player2Id : matchInfo.player1Id;

            const gameEndPayload = { matchId, winnerId, loserId, reason: "correct_flag" };
            if (matchSocketMap[winnerId]) {
                matchIo.to(matchSocketMap[winnerId]).emit("game_ended", gameEndPayload);
            }
            if (matchSocketMap[loserId]) {
                matchIo.to(matchSocketMap[loserId]).emit("game_ended", gameEndPayload);
            }

            // Clean up match data
            // TODO: Consider deleting files from Cloudinary here using challengeInfo.challengeFileDetails and matchId
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
                console.log(`Game End: Match ${mId} ended due to ${userId} disconnect. Opponent ${opponentId} wins.`);
                if (matchSocketMap[opponentId]) {
                    matchIo.to(matchSocketMap[opponentId]).emit("game_ended", {
                        matchId: mId,
                        winnerId: opponentId,
                        loserId: userId,
                        reason: "opponent_disconnected"
                    });
                }
                // Clean up match data
                // TODO: Consider deleting files from Cloudinary here
                delete activeMatches[mId];
                delete matchChallenges[mId];
                break; 
            }
        }
    });
});

export { io, app, server };

// Start the server (if this is your main entry file)
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));