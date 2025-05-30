// GamePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';

function GamePage() {
    const navigate = useNavigate();
    const { inGame, matchData, socket, resetGame, playerWins, gameEnded, gameResult } = useGameStore();
    const { authUser } = useAuthStore();

    const [showGameEndedDialog, setShowGameEndedDialog] = useState(false);
    const [isDeclaringWin, setIsDeclaringWin] = useState(false);

    // Effect for handling navigation based on game state
    useEffect(() => {
        // Navigate home if not authenticated OR if not in a game and no game result is being shown
        if (!authUser || (!inGame && !gameEnded)) {
            console.log("GamePage: Navigating home due to game state or no authUser.");
            navigate('/');
        }
    }, [authUser, inGame, gameEnded, navigate]);

    // Effect for showing game ended dialog
    useEffect(() => {
        if (gameEnded) {
            setShowGameEndedDialog(true);
            setIsDeclaringWin(false); // Reset button state
            console.log("GamePage: Game ended, showing dialog.");
        }
    }, [gameEnded]);

    // Handle the "I Win!" button click
    const handleWinClick = () => {
        // Only allow clicking if authenticated, match data exists,
        // not already declaring a win, and the game hasn't officially ended.
        if (authUser?._id && matchData?.matchId && !isDeclaringWin && !gameEnded) {
            setIsDeclaringWin(true);
            playerWins(matchData.matchId, authUser._id);
            console.log("GamePage: Attempting to declare win...");
        } else {
            console.warn("GamePage: Cannot declare win: Conditions not met (e.g., already clicked, game ended, or missing data).");
        }
    };

    // Handle "Back to Home" button in dialog
    const handleBackToHome = () => {
        setShowGameEndedDialog(false);
        resetGame(); // Resets game state and disconnects socket
    };

    // Render loading or unauthorized state
    if (!authUser) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-700">
                <h2 className="text-xl font-bold">Please log in to play.</h2>
                <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                    Go Home
                </button>
            </div>
        );
    }

    // Show loading if game is not active and no game result is pending to display
    if (!inGame && !gameEnded) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-700">
                <h2 className="text-xl font-bold">Loading game or redirecting...</h2>
            </div>
        );
    }

    // Main Game Page Content
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 p-4">
            <h1 className="text-4xl font-extrabold text-purple-800 mb-6 drop-shadow">
                Welcome to the Game!
            </h1>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center space-y-4">
                <p className="text-lg text-gray-700 font-medium">
                    You are <span className="text-indigo-600 font-semibold">{authUser._id}</span>
                </p>
                <p className="text-lg text-gray-700 font-medium">
                    Your opponent is <span className="text-red-500 font-semibold">{matchData?.opponentId || 'N/A'}</span>
                </p>
                <p className="text-md text-gray-600">
                    Match ID: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{matchData?.matchId || 'N/A'}</span>
                </p>

                <div className="mt-8">
                    <button
                        onClick={handleWinClick}
                        // Disable if socket not connected, game has ended, or currently declaring win
                        disabled={!socket?.connected || gameEnded || isDeclaringWin}
                        className="
                            bg-green-600 hover:bg-green-700 active:bg-green-800
                            text-white font-bold py-3 px-8 rounded-full shadow-lg
                            transition-all duration-300 ease-in-out transform
                            hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        {isDeclaringWin ? 'Declaring Win...' : 'I Win! (Click to end game)'}
                    </button>
                    {!socket?.connected && (
                        <p className="text-red-500 text-sm mt-2">Socket not connected. Cannot declare win.</p>
                    )}
                </div>
            </div>

            {/* Game Ended Dialog */}
            {showGameEndedDialog && gameResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-8 text-center max-w-sm mx-auto animate-fade-in-up">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Game Over!</h2>
                        <p className="text-xl text-gray-700 mb-6">
                            Winner: <span className="font-semibold text-purple-600">{gameResult.winnerId}</span>
                        </p>
                        {gameResult.reason === "opponent_disconnected" && (
                            <p className="text-md text-red-500 mb-4">Opponent Disconnected!</p>
                        )}
                        <button
                            onClick={handleBackToHome}
                            className="
                                bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md shadow-lg
                                transition-all duration-300 ease-in-out transform hover:-translate-y-1
                            "
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GamePage;