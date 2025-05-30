import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

function GamePage() {
    const { inGame, matchData, socket, resetGame, gameEnded, gameResult } = useGameStore();
    const { authUser } = useAuthStore();

    const [showGameEndedDialog, setShowGameEndedDialog] = useState(false);
    const [flagInput, setFlagInput] = useState('');
    const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (!authUser) {
            navigate('/');
            return;
        }
        if (gameEnded) {
            return;
        }
        if (!inGame) {
            navigate('/');
        }
    }, [authUser, inGame, gameEnded, navigate]);

    useEffect(() => {
        setShowGameEndedDialog(gameEnded);
        if (gameEnded) {
            setIsSubmittingFlag(false);
        }
    }, [gameEnded]);

    useEffect(() => {
        if (!socket) return;

        const handleFlagSubmissionResult = (data) => {
            setIsSubmittingFlag(false);
            if (data.success) {
                toast.success(data.message || 'Flag submission acknowledged!');
            } else {
                toast.error(data.message || 'Incorrect flag. Try again!');
            }
        };

        socket.on('flag_submission_result', handleFlagSubmissionResult);

        return () => {
            socket.off('flag_submission_result', handleFlagSubmissionResult);
        };
    }, [socket]);

    const handleSubmitFlag = () => {
        if (!socket?.connected || !matchData?.matchId || !flagInput.trim() || isSubmittingFlag) {
            toast.error('Please enter a flag or wait for the previous submission.');
            return;
        }
        setIsSubmittingFlag(true);
        socket.emit('submit_flag', {
            matchId: matchData.matchId,
            submittedFlag: flagInput.trim()
        });
    };

    const handleBackToHome = () => {
        setShowGameEndedDialog(false);
        resetGame();
        navigate('/');
    };

    const renderLoadingState = (message) => (
        <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 text-blue-700 p-4">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-blue-800">{message}</h2>
            <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-blue-400 border-t-blue-700 rounded-full animate-spin mt-6"></div>
        </div>
    );

    if (!authUser) {
        return renderLoadingState('Redirecting to login...');
    }

    if (!inGame && !gameEnded) {
        return renderLoadingState('Loading game...');
    }
    
    if (!matchData && inGame && !gameEnded) {
        return renderLoadingState('Waiting for match data...');
    }

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 font-sans text-blue-900">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-700 mt-14 mb-6 sm:mb-8 drop-shadow-lg tracking-tight text-center">
                Capture the Flag
            </h1>

            <div className="flex flex-col md:flex-row w-full max-w-7xl md:min-h-[calc(100vh-180px)] border border-blue-200 shadow-xl overflow-hidden mb-6 md:mb-0">
                {/* Player 1 Section - Always first on small screens */}
                <div className="flex-1 order-1 md:order-1 flex flex-col items-center justify-center bg-white p-6 md:p-8 border-b md:border-b-0 md:border-r border-blue-100 mb-6 md:mb-0">
                    <p className="text-lg md:text-xl font-medium text-blue-600 mb-2">You Are</p>
                    <p className="text-3xl md:text-4xl font-bold text-blue-800">
                        {authUser.username || 'Player 1'}
                    </p>
                </div>

                {/* Player 2 Section - Second on small screens, third on medium+ */}
                <div className="flex-1 order-2 md:order-3 flex flex-col items-center justify-center bg-white p-6 md:p-8 mb-6 md:mb-0">
                    <p className="text-lg md:text-xl font-medium text-blue-600 mb-2">Opponent</p>
                    <p className="text-3xl md:text-4xl font-bold text-blue-800">
                        {matchData?.opponentUsername || 'Opponent'}
                    </p>
                </div>

                {/* Challenge Section - Third on small screens, second on medium+ */}
                <div className="flex-[2] order-3 md:order-2 flex flex-col items-center text-center bg-blue-50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-blue-100 mb-6 md:mb-0">
                    <p className="text-base md:text-lg text-blue-600 mb-4 md:mb-6">
                        Match ID: <span className="font-mono text-xs sm:text-sm bg-blue-100 px-2 py-0.5 sm:px-3 sm:py-1 border border-blue-200 text-blue-700 select-all">{matchData?.matchId || 'N/A'}</span>
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-4 md:mb-5 border-b-2 border-blue-500 pb-2 inline-block">Challenge Files</h2>
                    <div className="bg-white p-4 md:p-6 text-left font-mono max-h-60 sm:max-h-80 overflow-y-auto border border-blue-200 w-full mb-6 shadow-sm">
                        {matchData?.challengeFiles?.length > 0 ? (
                            <ul className="list-disc list-inside text-blue-700 space-y-2 text-sm md:text-base">
                                {matchData.challengeFiles.map((file, index) => (
                                    <li key={index}>
                                        {file.url ? (
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={file.fileName}
                                                className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer text-sm md:text-base transition-colors duration-200"
                                                title={`Click to download or open ${file.fileName}. Right-click to copy link.`}
                                            >
                                                {file.fileName}
                                            </a>
                                        ) : (
                                            <span className="text-red-500 text-sm md:text-base" title="This file could not be prepared.">
                                                {file.fileName} (unavailable)
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-blue-500 text-sm md:text-base">No additional challenge files for this round.</p>
                        )}
                    </div>
                    <p className="text-lg md:text-xl text-blue-700 font-semibold mb-4">
                        Solve the challenge and submit the flag below to win!
                    </p>

                    {!gameEnded && (
                        <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-3 mt-4">
                            <input
                                type="text"
                                placeholder="Enter your flag here (e.g., CTF{...})"
                                value={flagInput}
                                onChange={(e) => setFlagInput(e.target.value)}
                                className="w-full px-3 py-2 border border-blue-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-blue-400 text-sm md:text-base"
                                disabled={!socket?.connected || gameEnded || isSubmittingFlag}
                            />
                            <button
                                onClick={handleSubmitFlag}
                                disabled={!socket?.connected || gameEnded || isSubmittingFlag || !flagInput.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-6 shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg tracking-wide"
                            >
                                {isSubmittingFlag ? 'Submitting...' : 'Submit Flag'}
                            </button>
                            {!socket?.connected && (
                                <p className="text-red-500 text-xs md:text-sm mt-2">Connection lost. Cannot submit flag.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showGameEndedDialog && gameResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-blue-200 shadow-xl p-6 sm:p-10 text-center max-w-sm sm:max-w-md mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-blue-800 mb-4 sm:mb-5">Game Over!</h2>
                        <p className="text-xl sm:text-2xl text-blue-700 mb-2">
                            Winner: <span className="font-semibold text-blue-600">{gameResult.winnerUsername || 'N/A'}</span>
                        </p>
                        <p className="text-xl sm:text-2xl text-blue-700 mb-6 sm:mb-8">
                            Loser: <span className="font-semibold text-red-500">{gameResult.loserUsername || 'N/A'}</span>
                        </p>
                        {gameResult.reason === 'opponent_disconnected' && (
                            <p className="text-sm sm:text-md text-red-500 mb-4 sm:mb-5">Opponent Disconnected!</p>
                        )}
                        {gameResult.reason === 'correct_flag' && (
                            <p className="text-sm sm:text-md text-green-600 mb-4 sm:mb-5 font-semibold">Flag Captured! You won!</p>
                        )}
                        <button
                            onClick={handleBackToHome}
                            className="mt-4 sm:mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1 text-base sm:text-lg"
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