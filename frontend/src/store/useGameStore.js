import { create } from "zustand";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const BASE_URL = "http://localhost:5001";

const gameSocketInstances = new Map();

const initializeGameSocket = (authUser, set, get) => {
    if (!authUser?._id) {
        toast.error("Invalid user data for socket initialization.");
        return null;
    }

    const existingSocketInfo = gameSocketInstances.get(authUser._id);
    if (existingSocketInfo?.instance.connected) {
        set({ socket: existingSocketInfo.instance });
        if (get().isMatchmaking) {
            existingSocketInfo.instance.emit('start_matchmaking', { userId: authUser._id, username: authUser.username });
        }
        return existingSocketInfo.instance;
    }

    if (existingSocketInfo) {
        existingSocketInfo.instance.disconnect();
        gameSocketInstances.delete(authUser._id);
    }

    const newSocket = io(`${BASE_URL}/match`, {
        autoConnect: false,
        query: {
            userId: String(authUser._id)
        }
    });

    gameSocketInstances.set(authUser._id, {
        instance: newSocket,
        userId: authUser._id,
        username: authUser.username
    });

    newSocket.on("connect", () => {
        toast.success("Connected to match socket!");
        set({ socket: newSocket });

        if (get().isMatchmaking) {
            newSocket.emit('start_matchmaking', { userId: authUser._id, username: authUser.username });
        }
    });

    newSocket.on("disconnect", (reason) => {
        toast.error(`Match socket disconnected: ${reason}`);
        set({
            socket: null,
            isMatchmaking: false,
            inGame: false,
            matchData: null,
            gameEnded: false,
            gameResult: null,
        });
        gameSocketInstances.delete(authUser._id);
    });

    newSocket.on("connect_error", (error) => {
        toast.error(`Match socket connection error: ${error.message}`);
        set({
            socket: null,
            isMatchmaking: false,
            inGame: false,
            matchData: null,
            gameEnded: false,
            gameResult: null
        });
        gameSocketInstances.delete(authUser._id);
    });

    newSocket.on("match_found", (matchData) => {
        toast.success(`Match found! Opponent: ${matchData.opponentUsername || matchData.opponentId}`);
        set({
            isMatchmaking: false,
            inGame: true,
            matchData: matchData,
            gameEnded: false,
            gameResult: null
        });
    });

    newSocket.on("game_ended", (data) => {
        const winnerName = data.winnerUsername || data.winnerId;
        toast.success(`Game Over! Winner: ${winnerName}`);
        set({
            gameEnded: true,
            gameResult: data,
            inGame: false,
            isMatchmaking: false,
        });
    });

    if (!newSocket.connected) {
        newSocket.connect();
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
        if (!authUser?._id || !authUser?.username) {
            toast.error("Please log in with a valid user to start matchmaking!");
            return;
        }

        set({
            isMatchmaking: true,
            gameEnded: false,
            gameResult: null,
            inGame: false,
            matchData: null,
        });

        initializeGameSocket(authUser, set, get);
    },

    disconnectSocket: () => {
        const currentSocket = get().socket;
        const currentAuthUserEntry = Array.from(gameSocketInstances.values()).find(info => info.instance === currentSocket);

        if (currentSocket?.connected && currentAuthUserEntry) {
            currentSocket.disconnect();
            gameSocketInstances.delete(currentAuthUserEntry.userId);
        }
        set({ socket: null });
    },

    stopMatchmaking: () => {
        const currentSocket = get().socket;
        if (currentSocket?.connected && get().isMatchmaking) {
            currentSocket.emit('stop_matchmaking');
            toast.success("Stopped matchmaking.");
        } else if (get().isMatchmaking) {
            toast.error("Failed to stop matchmaking. Socket not connected.");
        }
        set({ isMatchmaking: false });
    },

    playerWins: (matchId, winnerId) => {
        const currentSocket = get().socket;
        const { inGame, matchData } = get();

        if (currentSocket?.connected && inGame && matchData?.matchId === matchId) {
            currentSocket.emit("player_wins", { matchId, winnerId });
        } else {
            toast.error("Cannot declare win. Game state invalid.");
        }
    },

    resetGame: () => {
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