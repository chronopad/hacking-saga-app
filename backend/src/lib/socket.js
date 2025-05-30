import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const userSocketMap = {};
const matchSocketMap = {};
const matchmakingQueue = [];
const activeMatches = {};
const matchChallenges = {};

const CHALLENGES_BASE_PATH = path.join(process.cwd(), 'challenges');

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173'],
    },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

async function getLocalChallengeDetails() {
    try {
        const challengeDirs = await fs.readdir(CHALLENGES_BASE_PATH, { withFileTypes: true });
        const directories = challengeDirs.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

        if (directories.length === 0) {
            console.error('No challenge directories found in:', CHALLENGES_BASE_PATH);
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
            name: randomDirName,
            flag: flagTxt.trim(),
            localChallengeFiles: relevantLocalFiles,
        };
    } catch (error) {
        console.error('Error fetching random local challenge details:', error);
        return null;
    }
}

async function uploadFilesToCloudinary(challengeDirName, localFileNames, matchId) {
    const uploadedFileDetails = [];
    const challengeSourcePath = path.join(CHALLENGES_BASE_PATH, challengeDirName);

    for (const fileName of localFileNames) {
        const localFilePath = path.join(challengeSourcePath, fileName);
        try {
            const safeFileNameForPublicId = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
            const result = await cloudinary.uploader.upload(localFilePath, {
                resource_type: 'auto',
                folder: `ctf_matches/${matchId}`,
                public_id: safeFileNameForPublicId,
                overwrite: true,
            });
            uploadedFileDetails.push({
                fileName: fileName,
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
                error: 'Upload failed',
            });
        }
    }
    return uploadedFileDetails;
}

io.on('connection', (socket) => {
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

    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    socket.on('disconnect', (reason) => {
        console.log(`Socket Disconnected (Default): ID=${socket.id}, UserID=${userId || 'N/A'}, Reason=${reason}`);
        if (userId && userSocketMap[userId] === socket.id) {
            delete userSocketMap[userId];
        }
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

const matchIo = io.of('/match');
matchIo.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    let username = 'N/A';

    console.log(`Socket Connected (Match): ID=${socket.id}, UserID=${userId || 'N/A'}`);

    if (userId) {
        if (matchSocketMap[userId] && matchSocketMap[userId].socketId !== socket.id) {
            const oldSocket = matchIo.sockets.get(matchSocketMap[userId].socketId);
            if (oldSocket) {
                console.log(`Match Socket Cleanup: Disconnecting old socket ${matchSocketMap[userId].socketId} for user ${userId}.`);
                oldSocket.disconnect(true);
            }
        }
        matchSocketMap[userId] = { socketId: socket.id, username: null };
        socket.userId = userId;
    } else {
        console.warn(`Match Socket: Connected socket ${socket.id} has no userId in query.`);
        socket.disconnect(true);
        return;
    }

    socket.on('start_matchmaking', async (data) => {
        const { userId: eventUserId, username: eventUsername } = data;

        if (!eventUserId || !eventUsername) {
            console.warn(`Matchmaking: Invalid user data received for start_matchmaking from socket ${socket.id}. Data:`, data);
            socket.emit('matchmaking_error', { message: 'Missing user identification for matchmaking.' });
            return;
        }

        if (eventUserId !== socket.userId) {
            console.warn(`Matchmaking: Mismatch between event userId (${eventUserId}) and socket userId (${socket.userId}) for socket ${socket.id}.`);
            socket.emit('matchmaking_error', { message: 'User ID mismatch.' });
            return;
        }

        matchSocketMap[eventUserId].username = eventUsername;
        socket.username = eventUsername;

        console.log(`Matchmaking: User ${eventUsername} (${eventUserId}) requested to start matchmaking.`);

        try {
            const userInQueue = matchmakingQueue.find(p => p.userId === eventUserId);
            if (userInQueue) {
                console.log(`Matchmaking: User ${eventUsername} (${eventUserId}) already in queue.`);
                socket.emit('matchmaking_status', { message: 'You are already in the queue.' });
                return;
            }

            matchmakingQueue.push({ userId: eventUserId, username: eventUsername });
            socket.emit('matchmaking_status', { message: 'You have joined the matchmaking queue.' });
            console.log(`Matchmaking: User ${eventUsername} (${eventUserId}) added to queue. Current queue: ${matchmakingQueue.length} players.`);

            if (matchmakingQueue.length >= 2) {
                const player1 = matchmakingQueue.shift();
                const player2 = matchmakingQueue.shift();
                const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                const localChallenge = await getLocalChallengeDetails();
                if (!localChallenge) {
                    console.error(`Matchmaking Error: Failed to get local challenge details for match ${matchId}.`);
                    matchmakingQueue.unshift(player2);
                    matchmakingQueue.unshift(player1);
                    const errorMsg = 'Error finding a challenge. Please try again.';
                    if (matchSocketMap[player1.userId]) matchIo.to(matchSocketMap[player1.userId].socketId).emit('matchmaking_error', { message: errorMsg });
                    if (matchSocketMap[player2.userId]) matchIo.to(matchSocketMap[player2.userId].socketId).emit('matchmaking_error', { message: errorMsg });
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
                        matchmakingQueue.unshift(player2);
                        matchmakingQueue.unshift(player1);
                        const errorMsg = 'Error preparing challenge resources. Some files could not be made available. Please try again.';
                        if (matchSocketMap[player1.userId]) matchIo.to(matchSocketMap[player1.userId].socketId).emit('matchmaking_error', { message: errorMsg });
                        if (matchSocketMap[player2.userId]) matchIo.to(matchSocketMap[player2.userId].socketId).emit('matchmaking_error', { message: errorMsg });
                        return;
                    }
                } else {
                    console.log(`Matchmaking: No additional files to upload for challenge '${localChallenge.name}' for match ${matchId}`);
                }

                console.log(`Matchmaking: Found match ${matchId} between ${player1.username} (${player1.userId}) and ${player2.username} (${player2.userId}).`);
                activeMatches[matchId] = { player1, player2 };
                matchChallenges[matchId] = {
                    name: localChallenge.name,
                    flag: localChallenge.flag,
                    challengeFileDetails: uploadedChallengeFiles,
                };

                const clientFilePayload = uploadedChallengeFiles.map(f => ({ fileName: f.fileName, url: f.url }));

                const P1_Payload = { matchId, opponentId: player2.userId, opponentUsername: player2.username, challengeOutput: undefined, challengeFiles: clientFilePayload };
                const P2_Payload = { matchId, opponentId: player1.userId, opponentUsername: player1.username, challengeOutput: undefined, challengeFiles: clientFilePayload };

                if (matchSocketMap[player1.userId]) {
                    matchIo.to(matchSocketMap[player1.userId].socketId).emit('match_found', P1_Payload);
                } else {
                    console.warn(`Matchmaking: Player1 ${player1.username} (${player1.userId}) not found in map, cannot notify.`);
                }
                if (matchSocketMap[player2.userId]) {
                    matchIo.to(matchSocketMap[player2.userId].socketId).emit('match_found', P2_Payload);
                } else {
                    console.warn(`Matchmaking: Player2 ${player2.username} (${player2.userId}) not found in map, cannot notify.`);
                }
            }
        } catch (error) {
            console.error(`Matchmaking Error for user ${eventUsername} (${eventUserId}):`, error);
            socket.emit('matchmaking_error', { message: 'An unexpected error occurred. Please try again.' });
        }
    });

    socket.on('stop_matchmaking', () => {
        const currentUserId = socket.userId;
        const currentUsername = socket.username;

        if (!currentUserId) {
            console.warn(`Matchmaking: Cannot stop matchmaking for unknown user from socket ${socket.id}.`);
            return;
        }

        console.log(`Matchmaking: User ${currentUsername || 'N/A'} (${currentUserId}) requested to stop matchmaking.`);
        const initialQueueLength = matchmakingQueue.length;
        const newQueue = matchmakingQueue.filter(p => p.userId !== currentUserId);
        if (newQueue.length < initialQueueLength) {
            matchmakingQueue.splice(0, matchmakingQueue.length, ...newQueue);
            socket.emit('matchmaking_status', { message: 'You have left the matchmaking queue.' });
            console.log(`Matchmaking: User ${currentUsername || 'N/A'} (${currentUserId}) removed from queue. Current queue: ${matchmakingQueue.length} players.`);
        } else {
            console.log(`Matchmaking: User ${currentUsername || 'N/A'} (${currentUserId}) was not in queue.`);
        }
    });

    socket.on('submit_flag', ({ matchId, submittedFlag }) => {
        const currentUserId = socket.userId;
        const currentUsername = socket.username;

        if (!currentUserId || !currentUsername) {
            console.warn(`Flag Submission: Cannot process submission for unidentified user from socket ${socket.id}.`);
            socket.emit('flag_submission_result', { success: false, message: 'User not identified for this session.' });
            return;
        }

        console.log(`Flag Submission: User ${currentUsername} (${currentUserId}) submitted flag for match ${matchId}.`);

        const matchInfo = activeMatches[matchId];
        const challengeInfo = matchChallenges[matchId];

        if (!matchInfo || !challengeInfo) {
            console.warn(`Flag Submission: Invalid match ${matchId} or missing challenge data for user ${currentUsername} (${currentUserId}).`);
            socket.emit('flag_submission_result', { success: false, message: 'Invalid match or challenge data.' });
            return;
        }

        if (!matchInfo.player1 || !matchInfo.player2) {
            console.log(`Flag Submission: Game ${matchId} seems to have already concluded. Rejecting submission from ${currentUsername} (${currentUserId}).`);
            socket.emit('flag_submission_result', { success: false, message: 'Game has already concluded.' });
            return;
        }

        if (submittedFlag.trim() === challengeInfo.flag) {
            console.log(`Flag Submission: Correct flag submitted by ${currentUsername} (${currentUserId}) for match ${matchId}!`);

            const winner = (currentUserId === matchInfo.player1.userId) ? matchInfo.player1 : matchInfo.player2;
            const loser = (currentUserId === matchInfo.player1.userId) ? matchInfo.player2 : matchInfo.player1;

            const gameEndPayload = {
                matchId,
                winnerId: winner.userId,
                winnerUsername: winner.username,
                loserId: loser.userId,
                loserUsername: loser.username,
                reason: 'correct_flag'
            };

            if (matchSocketMap[winner.userId]) {
                matchIo.to(matchSocketMap[winner.userId].socketId).emit('game_ended', gameEndPayload);
            }
            if (matchSocketMap[loser.userId]) {
                matchIo.to(matchSocketMap[loser.userId].socketId).emit('game_ended', gameEndPayload);
            }

            delete activeMatches[matchId];
            delete matchChallenges[matchId];
            console.log(`Game End: Match ${matchId} ended due to correct flag submission.`);
        } else {
            console.log(`Flag Submission: Incorrect flag submitted by ${currentUsername} (${currentUserId}) for match ${matchId}.`);
            socket.emit('flag_submission_result', { success: false, message: 'Incorrect flag. Try again!' });
        }
    });

    socket.on('disconnect', (reason) => {
        const disconnectedUserId = socket.userId;
        const disconnectedUsername = socket.username;

        console.log(`Socket Disconnected (Match): ID=${socket.id}, UserID=${disconnectedUserId || 'N/A'}, Username=${disconnectedUsername || 'N/A'}, Reason=${reason}`);

        if (disconnectedUserId && matchSocketMap[disconnectedUserId] && matchSocketMap[disconnectedUserId].socketId === socket.id) {
            delete matchSocketMap[disconnectedUserId];
        }

        const initialQueueLength = matchmakingQueue.length;
        const newQueue = matchmakingQueue.filter(p => p.userId !== disconnectedUserId);
        if (newQueue.length < initialQueueLength) {
            matchmakingQueue.splice(0, matchmakingQueue.length, ...newQueue);
            console.log(`Matchmaking: User ${disconnectedUsername || 'N/A'} (${disconnectedUserId || 'N/A'}) removed from queue due to disconnect.`);
        }

        for (const mId in activeMatches) {
            const match = activeMatches[mId];
            let disconnectedPlayer = null;
            let opponentPlayer = null;

            if (match.player1.userId === disconnectedUserId) {
                disconnectedPlayer = match.player1;
                opponentPlayer = match.player2;
            } else if (match.player2.userId === disconnectedUserId) {
                disconnectedPlayer = match.player2;
                opponentPlayer = match.player1;
            }

            if (disconnectedPlayer) {
                console.log(`Game End: Match ${mId} ended due to ${disconnectedPlayer.username} (${disconnectedPlayer.userId}) disconnect. Opponent ${opponentPlayer.username} (${opponentPlayer.userId}) wins.`);

                const gameEndPayload = {
                    matchId: mId,
                    winnerId: opponentPlayer.userId,
                    winnerUsername: opponentPlayer.username,
                    loserId: disconnectedPlayer.userId,
                    loserUsername: disconnectedPlayer.username,
                    reason: 'opponent_disconnected'
                };

                if (matchSocketMap[opponentPlayer.userId]) {
                    matchIo.to(matchSocketMap[opponentPlayer.userId].socketId).emit('game_ended', gameEndPayload);
                }

                delete activeMatches[mId];
                delete matchChallenges[mId];
                break;
            }
        }
    });
});

export { io, app, server };