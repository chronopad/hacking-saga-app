// useGameStore.js
import { create } from "zustand";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const BASE_URL = "http://localhost:5001";
let gameSocketInstance = null;

export const useGameStore = create((set, get) => ({
    socket: null,
    isMatchmaking: false,

    startMatchmaking: (authUser) => {
        // Set matchmaking state to true immediately
        set({ isMatchmaking: true });
        // Call connectSocket; the emit will happen *after* connection
        get().connectSocket(authUser);
        console.log('User attempting to start matchmaking (connection initiated)...');
    },

    stopMatchmaking: () => {
        const currentSocket = get().socket;
        if (currentSocket?.connected) {
            currentSocket.emit('stop_matchmaking');
            console.log('Emitted stop_matchmaking event to server.');
        }

        set({ isMatchmaking: false });
        get().disconnectSocket();
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
            gameSocketInstance = null; // Clear immediately to allow fresh creation
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

                // FIX: Emit 'start_matchmaking' ONLY when the socket is confirmed connected,
                // and if the matchmaking state is still active (meaning user hasn't cancelled).
                if (get().isMatchmaking) {
                    gameSocketInstance.emit('start_matchmaking');
                    console.log('Emitted start_matchmaking event from on("connect") listener.');
                }
            });

            gameSocketInstance.on("disconnect", (reason) => {
                toast.error(`Match socket disconnected: ${reason}`);
                console.log("Match socket disconnected:", reason);
                set({ socket: null });
                set({ isMatchmaking: false });
                gameSocketInstance = null; // Clear the module-level instance to allow re-creation
            });

            gameSocketInstance.on("connect_error", (error) => {
                toast.error(`Match socket connection error: ${error.message}`);
                console.error("Match socket connection error:", error);
                set({ socket: null });
                set({ isMatchmaking: false });
            });

            // Add your game-specific listeners here
            gameSocketInstance.on("match_found", (matchData) => {
                toast.success(`Match found: ${matchData.matchId} with ${matchData.opponentId}!`);
                console.log("Match found:", matchData);
                set({ isMatchmaking: false }); // Stop matchmaking state when a match is found
                // You might want to update game state with matchData or navigate to a game screen
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
            set({ socket: null });
        }
    },
}));