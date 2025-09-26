'use client';

import { useState } from 'react';

const COMMON_EMOJIS = ['😊', '😂', '👍', '❤️', '🎉', '🤔', '👏', '💡'];

interface EmojiPickerProps {
    onEmojiSelect?: (emoji: string) => void;
}

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
                <span className="material-symbols-outlined">mood</span>
            </button>

            {isOpen && (
                <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                    <div className="grid grid-cols-4 gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onEmojiSelect?.(emoji);
                                    setIsOpen(false);
                                }}
                                className="p-1 hover:bg-gray-100 rounded text-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}