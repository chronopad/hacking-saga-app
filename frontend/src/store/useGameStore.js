// useGameStore.js
import { create } from "zustand";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const BASE_URL = "http://localhost:5001";

let gameSocketInfo = null;

// Modify initializeGameSocket to accept 'set' and 'get' functions directly
// (These will be passed from the Zustand store's 'create' callback)
const initializeGameSocket = (authUser, set, get) => { // <-- CHANGED SIGNATURE HERE
    // If a socket already exists and is for the same user and connected, reuse it.
    if (gameSocketInfo &&
        gameSocketInfo.instance.connected &&
        gameSocketInfo.userId === authUser._id) {
        console.log("Reusing existing and suitable game socket instance.");
        set({ socket: gameSocketInfo.instance }); // <-- Now 'set' is correctly available
        // If matchmaking is active, re-emit start_matchmaking,
        if (get().isMatchmaking) { // <-- Now 'get' is correctly available
            gameSocketInfo.instance.emit('start_matchmaking');
            console.log('Re-emitted start_matchmaking for existing connected socket.');
        }
        return gameSocketInfo.instance;
    }

    // If an existing socket is unsuitable (disconnected, different user), disconnect and clear it.
    if (gameSocketInfo) {
        console.log("Disconnecting old or unsuitable game socket instance.");
        gameSocketInfo.instance.disconnect();
        gameSocketInfo = null;
    }

    // Create a new socket instance
    console.log("Creating new game socket instance for /match namespace.");
    const newSocket = io(`${BASE_URL}/match`, {
        autoConnect: false,
        query: {
            userId: authUser._id
        }
    });

    // Store the new socket instance along with its associated userId
    gameSocketInfo = {
        instance: newSocket,
        userId: authUser._id
    };

    // --- Define Event Listeners for the newSocket ---
    newSocket.on("connect", () => {
        toast.success("You connected successfully to the match socket!");
        console.log(`[FRONTEND] Match socket connected: ${newSocket.id}`);
        set({ socket: newSocket }); // <-- Now 'set' is correctly available

        if (get().isMatchmaking) { // <-- Now 'get' is correctly available
            newSocket.emit('start_matchmaking');
            console.log('Emitted start_matchmaking from on("connect") listener.');
        } else {
            console.warn("Matchmaking not active on connect. Not emitting start_matchmaking.");
        }
    });

    newSocket.on("disconnect", (reason) => {
        toast.error(`Match socket disconnected: ${reason}`);
        console.log(`[FRONTEND] Match socket disconnected: ${reason}`);
        set({ // <-- Now 'set' is correctly available
            socket: null,
            isMatchmaking: false,
            inGame: false,
            matchData: null,
            gameEnded: false,
            gameResult: null
        });
        gameSocketInfo = null;
    });

    newSocket.on("connect_error", (error) => {
        toast.error(`Match socket connection error: ${error.message}`);
        console.error("[FRONTEND] Match socket connection error:", error);
        set({ // <-- Now 'set' is correctly available
            socket: null,
            isMatchmaking: false,
            inGame: false,
            matchData: null,
            gameEnded: false,
            gameResult: null
        });
        gameSocketInfo = null;
    });

    newSocket.on("match_found", (matchData) => {
        toast.success(`Match found! Opponent: ${matchData.opponentId}`);
        console.log("[FRONTEND] Match found:", matchData);
        set({ // <-- Now 'set' is correctly available
            isMatchmaking: false,
            inGame: true,
            matchData: matchData,
            gameEnded: false,
            gameResult: null
        });
    });

    newSocket.on("game_ended", (data) => {
        toast.success(`Game Over! Winner: ${data.winnerId}`);
        console.log("[FRONTEND] Game Ended:", data);
        set({ // <-- Now 'set' is correctly available
            gameEnded: true,
            gameResult: data,
            inGame: false,
            isMatchmaking: false,
        });
    });

    if (!newSocket.connected) {
        newSocket.connect();
        console.log("Attempting to connect match socket via .connect().");
    }

    return newSocket;
};

export const useGameStore = create((set, get) => ({ // 'set' and 'get' available here
    socket: null,
    isMatchmaking: false,
    inGame: false,
    matchData: null,
    gameEnded: false,
    gameResult: null,

    startMatchmaking: (authUser) => {
        if (!authUser) {
            console.warn("Cannot start matchmaking: No authenticated user.");
            toast.error("Please log in to start matchmaking!");
            return;
        }

        set({
            isMatchmaking: true,
            gameEnded: false,
            gameResult: null,
            inGame: false,
            matchData: null,
        });
        console.log("Starting matchmaking process...");

        // Pass 'set' and 'get' directly to initializeGameSocket
        initializeGameSocket(authUser, set, get); // <-- CHANGED CALL HERE
    },

    disconnectSocket: () => {
        if (gameSocketInfo?.instance.connected) {
            gameSocketInfo.instance.disconnect();
            console.log("Match socket instance manually disconnected.");
        } else {
            console.log("Match socket not connected, no explicit disconnect action needed.");
        }
        gameSocketInfo = null;
        set({ socket: null });
    },

    stopMatchmaking: () => {
        const currentSocket = get().socket;
        if (currentSocket?.connected && get().isMatchmaking) {
            currentSocket.emit('stop_matchmaking');
            console.log('Emitted stop_matchmaking event to server.');
            toast.success("Stopped matchmaking.");
        } else {
            console.log("Not in matchmaking or socket not connected, cannot stop.");
            if (get().isMatchmaking) {
                toast.error("Failed to stop matchmaking. Socket not connected.");
            }
        }
        set({ isMatchmaking: false });
    },

    playerWins: (matchId, winnerId) => {
        const currentSocket = get().socket;
        const { inGame, matchData } = get();

        if (currentSocket?.connected && inGame && matchData?.matchId === matchId) {
            currentSocket.emit("player_wins", { matchId, winnerId });
            console.log(`Emitting player_wins for match ${matchId}, winner ${winnerId}`);
        } else {
            console.warn("Cannot emit player_wins: Not in game, socket not connected, or invalid match data.");
            toast.error("Cannot declare win. Game state invalid.");
        }
    },

    resetGame: () => {
        console.log("Resetting game state and disconnecting socket.");
        get().disconnectSocket();
        set({
            isMatchmaking: false,
            inGame: false,
            matchData: null,
            gameEnded: false,
            gameResult: null,
        });
        toast.success("Game state reset.");
    },
}));