import { create } from "zustand";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const BASE_URL = "http://localhost:5001";

let gameSocketInfo = null;

let _gameHasEndedFlag = false;

const initializeGameSocket = (authUser, set, get) => {
    if (gameSocketInfo &&
        gameSocketInfo.instance.connected &&
        gameSocketInfo.userId === authUser._id) {
        console.log("Reusing existing and suitable game socket instance.");
        set({ socket: gameSocketInfo.instance });
        if (get().isMatchmaking) {
            gameSocketInfo.instance.emit('start_matchmaking');
            console.log('Re-emitted start_matchmaking for existing connected socket.');
        }
        return gameSocketInfo.instance;
    }

    if (gameSocketInfo) {
        console.log("Disconnecting old or unsuitable game socket instance.");
        gameSocketInfo.instance.disconnect();
        gameSocketInfo = null;
    }

    console.log("Creating new game socket instance for /match namespace.");
    const newSocket = io(`${BASE_URL}/match`, {
        autoConnect: false,
        query: {
            userId: authUser._id
        }
    });

    gameSocketInfo = {
        instance: newSocket,
        userId: authUser._id
    };

    newSocket.on("connect", () => {
        toast.success("You connected successfully to the match socket!");
        console.log(`[FRONTEND] Match socket connected: ${newSocket.id}`);
        set({ socket: newSocket });

        if (get().isMatchmaking) {
            newSocket.emit('start_matchmaking');
            console.log('Emitted start_matchmaking from on("connect") listener.');
        } else {
            console.warn("Matchmaking not active on connect. Not emitting start_matchmaking.");
        }
    });

    newSocket.on("disconnect", (reason) => {
        toast.error(`Match socket disconnected: ${reason}`);
        console.log(`[FRONTEND] Match socket disconnected: ${reason}`);

        set({
            socket: null,
            isMatchmaking: false,
            inGame: false,
            matchData: null,
        });
        gameSocketInfo = null;
    });

    newSocket.on("connect_error", (error) => {
        toast.error(`Match socket connection error: ${error.message}`);
        console.error("[FRONTEND] Match socket connection error:", error);
        set({
            socket: null,
            isMatchmaking: false,
            inGame: false,
            matchData: null,
            gameEnded: false,
            gameResult: null
        });
        gameSocketInfo = null;
        _gameHasEndedFlag = false;
    });

    newSocket.on("match_found", (matchData) => {
        toast.success(`Match found! Opponent: ${matchData.opponentId}`);
        console.log("[FRONTEND] Match found:", matchData);
        set({
            isMatchmaking: false,
            inGame: true,
            matchData: matchData,
            gameEnded: false,
            gameResult: null
        });
        _gameHasEndedFlag = false;
    });

    newSocket.on("game_ended", (data) => {
        toast.success(`Game Over! Winner: ${data.winnerId}`);
        console.log("[FRONTEND] Game Ended:", data);
        set({
            gameEnded: true,
            gameResult: data,
            inGame: false,
            isMatchmaking: false,
        });
        _gameHasEndedFlag = true;
    });

    if (!newSocket.connected) {
        newSocket.connect();
        console.log("Attempting to connect match socket via .connect().");
    }

    return newSocket;
};

export const useGameStore = create((set, get) => ({
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
        _gameHasEndedFlag = false;
        console.log("Starting matchmaking process...");

        initializeGameSocket(authUser, set, get);
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
        _gameHasEndedFlag = false;
        toast.success("Game state reset.");
    },
}));