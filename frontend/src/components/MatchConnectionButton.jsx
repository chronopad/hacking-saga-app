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
    inGame // Need to get inGame state to refine cleanup logic
  } = useGameStore();

  const { authUser } = useAuthStore();

  // FIX: Modified useEffect cleanup condition
  useEffect(() => {
    return () => {
      // Access the latest state directly from the store to ensure it's up-to-date
      const {
          isMatchmaking: currentIsMatchmaking,
          inGame: currentInGame, // Get inGame for cleanup logic
          stopMatchmaking: currentStopMatchmaking
      } = useGameStore.getState();

      // Only attempt to stop matchmaking if we were in matchmaking state
      // AND we are NOT currently in a game (meaning a match wasn't found before unmount).
      if (currentIsMatchmaking && !currentInGame) {
        console.log("MatchConnectionButton unmounting: Attempting to stop matchmaking as game not started.");
        currentStopMatchmaking();
      }
      // If currentInGame is true, it means a match was found, and the socket should remain connected for the game.
    };
  }, []); // Empty dependency array: cleanup runs ONLY on unmount

  const handleStartMatchingClick = () => {
    if (!authUser) {
      console.log("Cannot start matchmaking: User not logged in.");
      return;
    }
    startMatchmaking(authUser);
    console.log('User attempting to start matchmaking...');
  };

  const handleStopMatchingClick = () => {
    stopMatchmaking();
    console.log('User attempting to stop matchmaking...');
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

      {!isMatchmaking && !inGame ? ( // FIX: Only show Start button if not matchmaking AND not in game
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
      ) : ( // Show Stop button if matchmaking OR in game (to allow stopping from game page too if needed, though this button won't be visible there)
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

      {socket && socket.connected && (
        <button
          onClick={() => {
            socket.emit('game_message', { message: 'Hello from game client!', userId: authUser?._id });
            console.log('Emitted general game_message event');
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