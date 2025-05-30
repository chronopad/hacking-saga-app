import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ChatPage from "./pages/ChatPage";
import GamePage from "./pages/GamePage";

import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"; 
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useGameStore } from "./store/useGameStore"; 
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
    const { theme } = useThemeStore();
    const { inGame } = useGameStore(); 

    console.log({ onlineUsers });

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (inGame && location.pathname !== '/game') {
            console.log("App.jsx: Match found, inGame is true. Navigating to /game.");
            navigate('/game');
        }
    }, [inGame, location.pathname, navigate]);

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
                <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />

                <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
                <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />

                <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" />} />
                <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
                <Route path="/chat" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />

                <Route path="/game" element={authUser ? <GamePage /> : <Navigate to="/login" />} />
            </Routes>

            <Toaster />
        </div>
    );
};
export default App;