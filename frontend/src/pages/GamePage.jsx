import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';

function GamePage() {
    const {
        inGame,
        matchData,
        socket,
        resetGame,
        playerWins,
        gameEnded,
        gameResult
    } = useGameStore();
    const { authUser } = useAuthStore();

    const [showGameEndedDialog, setShowGameEndedDialog] = useState(false);
    const [isAttemptingWinDeclaration, setIsAttemptingWinDeclaration] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        console.log("GamePage useEffect (navigation) re-running.");
        console.log("  inGame (nav):", inGame);
        console.log("  gameEnded (nav):", gameEnded);
        console.log("  authUser (nav):", authUser ? "present" : "absent");

        if (!authUser) {
            console.log("GamePage: Navigating home - no authenticated user.");
            navigate('/');
            return;
        }

        if (gameEnded) {
            console.log("GamePage: Staying on page - game has ended, waiting for dialog.");
            return;
        }

        if (inGame) {
            console.log("GamePage: Staying on page - currently in game.");
            return;
        }

        console.log("GamePage: Navigating home - neither inGame nor gameEnded is true and authUser exists.");
        navigate('/');
    }, [authUser, inGame, gameEnded, navigate]);

    useEffect(() => {
        console.log("GamePage useEffect (dialog) re-running. gameEnded (dialog):", gameEnded);
        if (gameEnded) {
            setShowGameEndedDialog(true);
            setIsAttemptingWinDeclaration(false);
            console.log("GamePage: Game ended, setting dialog to true.");
        } else {
            setShowGameEndedDialog(false);
        }
    }, [gameEnded]);

    const handleWinClick = () => {
        if (authUser?._id && matchData?.matchId && !isAttemptingWinDeclaration && !gameEnded) {
            setIsAttemptingWinDeclaration(true);
            playerWins(matchData.matchId, authUser._id);
            console.log("GamePage: Attempting to declare win...");
        } else {
            console.warn("GamePage: Cannot declare win. Missing data, already clicked, or game already ended.");
        }
    };

    const handleBackToHome = () => {
        console.log("GamePage: 'Back to Home' button pressed.");
        setShowGameEndedDialog(false);
        resetGame();
    };

    if (!authUser) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-700">
                <h2 className="text-xl font-bold mb-4">Please log in to play.</h2>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                >
                    Go Home
                </button>
            </div>
        );
    }

    if (!inGame && !gameEnded) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Finding your opponent...</h2>
                <p className="text-lg text-gray-600">Please wait, matchmaking in progress.</p>
                <div className="w-12 h-12 border-4 border-purple-400 border-t-purple-700 rounded-full animate-spin mt-6"></div>
            </div>
        );
    }

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
                        disabled={!socket?.connected || gameEnded || isAttemptingWinDeclaration}
                        className="
                            bg-green-600 hover:bg-green-700 active:bg-green-800
                            text-white font-bold py-3 px-8 rounded-full shadow-lg
                            transition-all duration-300 ease-in-out transform
                            hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        {isAttemptingWinDeclaration ? 'Declaring Win...' : 'I Win! (Click to end game)'}
                    </button>
                    {!socket?.connected && (
                        <p className="text-red-500 text-sm mt-2">Socket not connected. Cannot declare win.</p>
                    )}
                </div>
            </div>

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