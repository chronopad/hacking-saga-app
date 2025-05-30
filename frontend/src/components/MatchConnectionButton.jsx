// MatchConnectionButton.jsx
import React, { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';

function MatchConnectionButton() {
    const {
        socket,
        isMatchmaking,
        startMatchmaking,
        stopMatchmaking,
        inGame // Ensure inGame is destructured
    } = useGameStore();

    const { authUser } = useAuthStore();

    // Effect for cleaning up matchmaking state on component unmount
    useEffect(() => {
        return () => {
            // Get the latest state directly from the store at cleanup time
            const { isMatchmaking: currentIsMatchmaking, inGame: currentInGame } = useGameStore.getState();

            // If component unmounts while matchmaking is active AND we are NOT in a game,
            // then explicitly stop matchmaking. If inGame is true, it means a match was found,
            // and the game page will take over, so we don't stop matchmaking here.
            if (currentIsMatchmaking && !currentInGame) {
                console.log("MatchConnectionButton: Component unmounting while matchmaking, stopping matchmaking.");
                useGameStore.getState().stopMatchmaking();
            }
        };
    }, []); // Empty dependency array means this runs once on mount, and cleanup on unmount

    const handleStartMatchingClick = () => {
        if (!authUser) {
            console.log("MatchConnectionButton: Cannot start matchmaking: User not logged in.");
            return;
        }
        startMatchmaking(authUser);
        console.log('MatchConnectionButton: User attempting to start matchmaking...');
    };

    const handleStopMatchingClick = () => {
        stopMatchmaking();
        console.log('MatchConnectionButton: User attempting to stop matchmaking...');
    };

    const isStartButtonDisabled = !authUser;

    return (
        <div className="flex flex-col items-center gap-2 p-2">
            <h1 className="text-lg font-semibold text-gray-800">
                Matchmaking Status:{" "}
                <span className={isMatchmaking ? "text-blue-600" : "text-gray-500"}>
                    {isMatchmaking ? "Searching for opponent..." : "Idle"}
                </span>
            </h1>
            <p className="text-xs text-gray-600">
                Socket ID: {socket?.id || "N/A"} (Connected:{" "}
                <span className={socket?.connected ? "text-green-500" : "text-red-500"}>
                    {socket?.connected ? "Yes" : "No"}
                </span>
                )
            </p>

            {/* Show Start button if not matchmaking AND not in game */}
            {!isMatchmaking && !inGame ? (
                <button
                    onClick={handleStartMatchingClick}
                    className={`
                        bg-indigo-600 text-white font-bold py-2 px-6 rounded-md shadow-lg
                        transition-all duration-300 ease-in-out transform
                        ${isStartButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 hover:-translate-y-1'}
                    `}
                    disabled={isStartButtonDisabled}
                >
                    {!authUser ? 'Login to Match' : 'Start Matching'}
                </button>
            ) : (
                // Show Stop button if matchmaking (inGame should ideally not be true here, but handled for robustness)
                <button
                    onClick={handleStopMatchingClick}
                    className="
                        bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md shadow-lg
                        transition-all duration-300 ease-in-out transform hover:-translate-y-1
                    "
                >
                    Stop Matching
                </button>
            )}

            {/* Example message emit button (optional, for debugging/dev) */}
            {socket && socket.connected && (
                <button
                    onClick={() => {
                        socket.emit('game_message', { message: 'Hello from game client!', userId: authUser?._id });
                        console.log('MatchConnectionButton: Emitted general game_message event');
                    }}
                    className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-3 rounded-md shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
                >
                    Emit Example Game Message
                </button>
            )}
        </div>
    );
}

export default MatchConnectionButton;