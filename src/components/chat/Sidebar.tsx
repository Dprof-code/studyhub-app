interface ChatListItem {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    unreadCount: number;
    timestamp: string;
}

interface SidebarProps {
    chats: ChatListItem[];
    activeRoomId?: string;
    onChatSelect?: (roomId: string) => void;
}

export default function Sidebar({ chats, activeRoomId, onChatSelect }: SidebarProps) {
    return (
        <div className="w-80 bg-gray-50 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            </div>
            <div className="overflow-y-auto">
                {chats.map(chat => (
                    <div
                        key={chat.id}
                        onClick={() => onChatSelect?.(chat.id)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors ${activeRoomId === chat.id ? 'bg-white border-l-4 border-l-primary' : ''
                            }`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <img
                                    src={chat.avatar}
                                    alt={chat.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                {chat.unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {chat.unreadCount}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{chat.name}</p>
                                <p className="text-xs text-gray-600 truncate">{chat.lastMessage}</p>
                            </div>
                            <div className="text-xs text-gray-500">{chat.timestamp}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}