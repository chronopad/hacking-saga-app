import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore'; // Assuming your Zustand store is here
import { useAuthStore } from '../store/useAuthStore'; // Assuming your Zustand store is here
import toast from 'react-hot-toast';

function GamePage() {
    const {
        inGame,
        matchData, // Expects matchData.challengeFiles to be [{fileName, url}, ...]
        socket,
        resetGame,
        gameEnded,
        gameResult
    } = useGameStore();
    const { authUser } = useAuthStore();

    const [showGameEndedDialog, setShowGameEndedDialog] = useState(false);
    const [flagInput, setFlagInput] = useState('');
    const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        // Navigation logic
        if (!authUser) {
            navigate('/');
            return;
        }
        if (gameEnded) { // If game has ended, stay to show dialog
            return;
        }
        if (!inGame) { // If not in game and game hasn't just ended, go home
            navigate('/');
        }
    }, [authUser, inGame, gameEnded, navigate]);

    useEffect(() => {
        // Dialog logic
        if (gameEnded) {
            setShowGameEndedDialog(true);
            setIsSubmittingFlag(false);
        } else {
            setShowGameEndedDialog(false);
        }
    }, [gameEnded]);

    useEffect(() => {
        // Socket listener for flag submission results
        if (!socket) return;

        const handleFlagSubmissionResult = (data) => {
            setIsSubmittingFlag(false);
            if (data.success) {
                toast.success(data.message || "Flag submission acknowledged!");
            } else {
                toast.error(data.message || "Incorrect flag. Try again!");
            }
        };

        socket.on("flag_submission_result", handleFlagSubmissionResult);

        return () => {
            socket.off("flag_submission_result", handleFlagSubmissionResult);
        };
    }, [socket]);

    // The handleDownloadFile function is no longer needed as we use direct anchor tags.

    const handleSubmitFlag = () => {
        if (!socket?.connected || !matchData?.matchId || !flagInput.trim() || isSubmittingFlag) {
            toast.error("Please enter a flag or wait for previous submission.");
            return;
        }
        setIsSubmittingFlag(true);
        socket.emit("submit_flag", {
            matchId: matchData.matchId,
            submittedFlag: flagInput.trim()
        });
    };

    const handleBackToHome = () => {
        setShowGameEndedDialog(false);
        resetGame();
    };

    if (!authUser) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-700">
                <h2 className="text-xl font-bold mb-4">Redirecting to login...</h2>
            </div>
        );
    }

    if (!inGame && !gameEnded) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Loading game...</h2>
                <div className="w-12 h-12 border-4 border-purple-400 border-t-purple-700 rounded-full animate-spin mt-6"></div>
            </div>
        );
    }
    
    if (!matchData && inGame && !gameEnded) {
         return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Waiting for match data...</h2>
                <div className="w-12 h-12 border-4 border-purple-400 border-t-purple-700 rounded-full animate-spin mt-6"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 p-4">
            <h1 className="text-4xl font-extrabold text-purple-800 mb-6 drop-shadow">
                Capture the Flag!
            </h1>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full text-center space-y-4">
                <p className="text-lg text-gray-700 font-medium">
                    You are <span className="text-indigo-600 font-semibold">{authUser.username || authUser._id}</span>
                </p>
                <p className="text-lg text-gray-700 font-medium">
                    Your opponent is <span className="text-red-500 font-semibold">{matchData?.opponentId || 'N/A'}</span>
                </p>
                <p className="text-md text-gray-600 mb-6">
                    Match ID: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{matchData?.matchId || 'N/A'}</span>
                </p>

                <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">Challenge Files:</h2>
                <div className="bg-gray-100 p-4 rounded-md text-left font-mono max-h-60 overflow-y-auto">
                    {matchData?.challengeFiles && matchData.challengeFiles.length > 0 ? (
                        <ul className="list-disc list-inside text-gray-700">
                            {matchData.challengeFiles.map((file, index) => (
                                <li key={index} className="mb-1">
                                    {file.url ? (
                                        <a
                                            href={file.url}
                                            target="_blank" // Open in new tab
                                            rel="noopener noreferrer" // Security best practice for target="_blank"
                                            download={file.fileName} // Suggests filename (browser might override for cross-origin)
                                            className="text-blue-600 hover:underline cursor-pointer text-base"
                                            title={`Click to download or open ${file.fileName}. Right-click to copy link.`}
                                        >
                                            {file.fileName}
                                        </a>
                                    ) : (
                                        <span className="text-red-500" title="This file could not be prepared.">
                                            {file.fileName} (unavailable)
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No additional challenge files for this round.</p>
                    )}
                </div>
                <p className="text-lg text-gray-700 mt-4">
                    Solve the challenge and enter the correct flag below to win!
                </p>

                {!gameEnded && (
                    <div className="mt-8 flex flex-col items-center gap-4">
                        <input
                            type="text"
                            placeholder="Enter your flag here (e.g., CTF{...})"
                            value={flagInput}
                            onChange={(e) => setFlagInput(e.target.value)}
                            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={!socket?.connected || gameEnded || isSubmittingFlag}
                        />
                        <button
                            onClick={handleSubmitFlag}
                            disabled={!socket?.connected || gameEnded || isSubmittingFlag || !flagInput.trim()}
                            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmittingFlag ? 'Submitting...' : 'Submit Flag'}
                        </button>
                        {!socket?.connected && (
                            <p className="text-red-500 text-sm mt-2">Connection lost. Cannot submit flag.</p>
                        )}
                    </div>
                )}
            </div>

            {showGameEndedDialog && gameResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-8 text-center max-w-sm mx-auto animate-fade-in-up">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Game Over!</h2>
                        <p className="text-xl text-gray-700 mb-1">
                            Winner: <span className="font-semibold text-purple-600">{gameResult.winnerId}</span>
                        </p>
                         <p className="text-xl text-gray-700 mb-6">
                            Loser: <span className="font-semibold text-red-500">{gameResult.loserId}</span>
                        </p>
                        {gameResult.reason === "opponent_disconnected" && (
                            <p className="text-md text-red-500 mb-4">Opponent Disconnected!</p>
                        )}
                        {gameResult.reason === "correct_flag" && (
                            <p className="text-md text-green-500 mb-4">Flag Captured!</p>
                        )}
                        <button
                            onClick={handleBackToHome}
                            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1"
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