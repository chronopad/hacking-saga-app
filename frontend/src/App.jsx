import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ChatPage from "./pages/ChatPage";
import GamePage from "./pages/GamePage"; // Make sure GamePage is imported

import { Routes, Route, Navigate, useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useGameStore } from "./store/useGameStore"; // Import useGameStore
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
    const navigate = useNavigate(); // Get the navigate function
    const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
    const { theme } = useThemeStore();
    const { inGame, matchData } = useGameStore(); // Get inGame and matchData from useGameStore

    console.log({ onlineUsers });

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // --- Game Navigation Logic ---
    useEffect(() => {
        // If a match is found and game is active, navigate to the game page
        if (inGame && matchData) {
            console.log("App.jsx: inGame is true, navigating to /game");
            navigate('/game');
        } else if (!inGame && location.pathname === '/game') {
            // If not in game but currently on /game path, navigate back to home
            console.log("App.jsx: inGame is false, currently on /game, navigating to /");
            navigate('/');
        }
    }, [inGame, matchData, navigate]); // Dependencies for this effect

    console.log({ authUser });

    if (isCheckingAuth && !authUser)
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader className="size-10 animate-spin" />
            </div>
        );

    return (
        <div data-theme={theme}>
            <Navbar />

            <Routes>
                {/* Protected Home Page */}
                <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />

                {/* Authentication Routes */}
                <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
                <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />

                {/* Other Protected Pages */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
                <Route path="/chat" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />

                {/* --- New: Game Page Route --- */}
                {/* Access to GamePage should be controlled by the inGame state */}
                <Route path="/game" element={inGame && authUser ? <GamePage /> : <Navigate to="/" />} />
            </Routes>

            <Toaster />
        </div>
    );
};
export default App;