import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const UserList = () => {
    const { users, getUsers, isUsersLoading } = useChatStore();
    const { onlineUsers, authUser } = useAuthStore();

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        getUsers();
    }, [getUsers]);

    const sortedUsers = [...users].sort((a, b) => {
        const aIsOnline = onlineUsers.includes(a._id);
        const bIsOnline = onlineUsers.includes(b._id);

        if (aIsOnline && !bIsOnline) {
            return -1;
        }

        if (!aIsOnline && bIsOnline) {
            return 1;
        }
        return (a.username || "").localeCompare(b.username || "");
    });

    const otherOnlinePlayersCount = onlineUsers.filter(id => id !== authUser?._id).length;
    const onlineStatusText = otherOnlinePlayersCount === 0 
        ? "No other player active" 
        : `(${otherOnlinePlayersCount}) other player online.`;

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-1/2 right-0 transform -translate-y-1/2 text-blue-500 px-3 py-2 rounded-md shadow-lg z-50 
                           transition-colors duration-200 hover:text-blue-600 h-[50%] w-10
                           md:hidden bg-white/80"
                aria-label={isOpen ? "Close user list" : "Open user list"}
            >
                {isOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
            </button>

            <div
                className={`absolute right-0 top-1/4 h-[50%] w-64 z-40 bg-white/80 backdrop-blur-sm p-4 
                            border-l border-gray-200 rounded-l-lg shadow-xl flex flex-col 
                            transition-transform duration-300 ease-in-out
                            ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
                            md:translate-x-0`}
            >
                <div className="mb-4">
                    <h1 className="text-gray-800 font-extrabold text-center text-2xl">
                        Players List
                    </h1>
                    <p className="text-gray-600 text-sm text-center mt-1">
                        {onlineStatusText}
                    </p>
                </div>

                {isUsersLoading ? (
                    <div className="flex-grow flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-gray-600 ml-2">Loading users...</p>
                    </div>
                ) : (
                    <ul className="flex-grow space-y-2 overflow-y-auto pr-2">
                        {users.length > 0 ? (
                            sortedUsers.map((user) => {
                                const isOnline = onlineUsers.includes(user._id);
                                const isCurrentUser = authUser && authUser._id === user._id;

                                return (
                                    <li
                                        key={user._id} 
                                        className={`relative flex items-center gap-3 p-2 rounded-lg 
                                                    transition-all duration-200 cursor-pointer
                                                    ${isCurrentUser 
                                                        ? 'bg-blue-100 border border-blue-300 shadow-sm' 
                                                        : 'bg-gray-100 hover:bg-gray-200'}`}
                                    >
                                        <img
                                            src={user.profilePic || "/avatar.png"}
                                            alt={user.username || "User avatar"}
                                            className="size-10 object-cover rounded-full flex-shrink-0"
                                        />

                                        <div className="flex flex-col flex-grow truncate">
                                            <p className="font-semibold text-gray-800 truncate">
                                                {user.username || "Unknown User"}
                                                {isCurrentUser && <span className="ml-1 text-blue-600 text-xs">(You)</span>}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs">
                                                <span className={`size-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                <span className={`${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-sm text-center py-4">
                                No registered players found.
                            </p>
                        )}
                    </ul>
                )}
            </div>
        </>
    );
};

export default UserList;