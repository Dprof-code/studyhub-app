interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    type?: 'text' | 'image' | 'file';
}

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    return (
        <div className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                {!isOwn && (
                    <p className="text-xs text-gray-600 mb-1 px-3">{message.senderName}</p>
                )}
                <div className={`rounded-lg px-4 py-2 ${isOwn
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                    }`}>
                    <p className="text-sm">{message.content}</p>
                </div>
                <p className={`text-xs text-gray-500 mt-1 px-3 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {message.timestamp}
                </p>
            </div>
        </div>
    );
}