interface Participant {
    id: string;
    name: string;
    avatar: string;
    status?: 'online' | 'offline';
}

interface ChatHeaderProps {
    participants: Participant[];
    onScheduleStudySession?: () => void;
}

export default function ChatHeader({ participants, onScheduleStudySession }: ChatHeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
                <div className="flex -space-x-2">
                    {participants.slice(0, 3).map(participant => (
                        <div key={participant.id} className="relative">
                            <img
                                src={participant.avatar}
                                alt={participant.name}
                                className="w-8 h-8 rounded-full border-2 border-white object-cover"
                            />
                            {participant.status === 'online' && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                            )}
                        </div>
                    ))}
                    {participants.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                            +{participants.length - 3}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-sm font-medium text-gray-900">
                        {participants.length === 1
                            ? participants[0].name
                            : `${participants[0].name} ${participants.length > 2 ? `and ${participants.length - 1} others` : `and ${participants[1].name}`}`
                        }
                    </h3>
                    <p className="text-xs text-gray-600">
                        {participants.filter(p => p.status === 'online').length} online
                    </p>
                </div>
            </div>

            <button
                onClick={onScheduleStudySession}
                className="px-3 py-1.5 bg-primary text-white text-xs rounded-md hover:bg-primary/90 transition-colors"
            >
                Schedule Study
            </button>
        </div>
    );
}