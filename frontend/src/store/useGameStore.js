// useGameStore.js
import { create } from "zustand";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const BASE_URL = "http://localhost:5001";
let gameSocketInstance = null;

export const useGameStore = create((set, get) => ({
    socket: null,
    isMatchmaking: false,
    inGame: false,
    matchData: null,
    gameEnded: false,   // NEW: State to signal game has concluded
    gameResult: null,   // NEW: Stores winner/loser info

    startMatchmaking: (authUser) => {
        set({ isMatchmaking: true, gameEnded: false, gameResult: null }); // Reset game end states on start
        get().connectSocket(authUser);
        console.log('User attempting to start matchmaking (connection initiated)...');
    },

    stopMatchmaking: () => {
        const currentSocket = get().socket;
        if (currentSocket?.connected && get().isMatchmaking) {
            currentSocket.emit('stop_matchmaking');
            console.log('Emitted stop_matchmaking event to server.');
        }
        set({ isMatchmaking: false });
    },

    connectSocket: (authUser) => {
        if (!authUser) {
            console.log("Connect attempt aborted: No authUser provided.");
            return;
        }

        if (gameSocketInstance?.connected && gameSocketInstance.handshake.query.userId === authUser._id) {
            console.log("Connect attempt aborted: Already connected for this user.");
            set({ socket: gameSocketInstance });
            return;
        }

        if (gameSocketInstance?.connected && gameSocketInstance.handshake.query.userId !== authUser._id) {
            console.log("Connect attempt: Socket connected for a different user. Disconnecting old socket.");
            gameSocketInstance.disconnect();
            gameSocketInstance = null;
        }

        if (!gameSocketInstance) {
            gameSocketInstance = io(`${BASE_URL}/match`, {
                autoConnect: false,
                query: {
                    userId: authUser._id
                }
            });

            gameSocketInstance.on("connect", () => {
                toast.success("You connected successfully to the match socket!");
                console.log("Match socket connected:", gameSocketInstance.id);
                set({ socket: gameSocketInstance });

                if (get().isMatchmaking) {
                    gameSocketInstance.emit('start_matchmaking');
                    console.log('Emitted start_matchmaking event from on("connect") listener.');
                }
            });

            gameSocketInstance.on("disconnect", (reason) => {
                toast.error(`Match socket disconnected: ${reason}`);
                console.log("Match socket disconnected:", reason);
                // On disconnect, ensure all game states are reset
                set({ socket: null, isMatchmaking: false, inGame: false, matchData: null, gameEnded: false, gameResult: null });
                gameSocketInstance = null;
            });

            gameSocketInstance.on("connect_error", (error) => {
                toast.error(`Match socket connection error: ${error.message}`);
                console.error("Match socket connection error:", error);
                // On connect error, ensure all game states are reset
                set({ socket: null, isMatchmaking: false, inGame: false, matchData: null, gameEnded: false, gameResult: null });
            });

            gameSocketInstance.on("match_found", (matchData) => {
                toast.success(`Match found! Opponent: ${matchData.opponentId}`);
                console.log("Match found:", matchData);
                set({
                    isMatchmaking: false,
                    inGame: true,
                    matchData: matchData,
                    gameEnded: false, // Ensure this is false at game start
                    gameResult: null  // Ensure this is null at game start
                });
            });

            // FIX: game_ended now just sets state, doesn't call resetGame immediately
            gameSocketInstance.on("game_ended", (data) => {
                toast.success(`Game Over! Winner: ${data.winnerId}`);
                console.log("Game Ended:", data);
                set({
                    gameEnded: true,
                    gameResult: data // Store the winner/loser info
                });
                // resetGame will be called from the GamePage component when the user dismisses the dialog
            });

        }

        if (!gameSocketInstance.connected) {
            console.log("Attempting to connect match socket...");
            gameSocketInstance.connect();
        } else {
            set({ socket: gameSocketInstance });
        }
    },

    disconnectSocket: () => {
        if (gameSocketInstance?.connected) {
            gameSocketInstance.disconnect();
            console.log("Match socket instance manually disconnected.");
        } else {
            console.log("Match socket not connected, no explicit disconnect action needed.");
            gameSocketInstance = null;
            set({ socket: null, inGame: false, matchData: null, gameEnded: false, gameResult: null });
        }
    },

    playerWins: (matchId, winnerId) => {
        const currentSocket = get().socket;
        if (currentSocket?.connected && get().inGame && get().matchData?.matchId === matchId) {
            currentSocket.emit("player_wins", { matchId, winnerId });
            console.log(`Emitting player_wins for match ${matchId}, winner ${winnerId}`);
        } else {
            console.warn("Cannot emit player_wins: Not in game or socket not connected.");
        }
    },

    // resetGame now explicitly disconnects the socket and cleans up state after a game
    resetGame: () => {
        console.log("Resetting game state and disconnecting socket.");
        set({
            isMatchmaking: false,
            inGame: false,
            matchData: null,
            gameEnded: false, // Reset this
            gameResult: null  // Reset this
        });
        get().disconnectSocket(); // Disconnect the game socket when game ends
    },
}));