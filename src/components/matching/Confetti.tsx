'use client';

import { useEffect, useState } from 'react';

export default function Confetti() {
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);

    useEffect(() => {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        const newParticles = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 2
        }));
        setParticles(newParticles);
    }, []);

    return (
        <div className="relative w-32 h-32 mx-auto">
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className="absolute w-2 h-2 rounded-full animate-bounce"
                    style={{
                        backgroundColor: particle.color,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        animationDelay: `${particle.delay}s`,
                        animationDuration: '1.5s'
                    }}
                />
            ))}
            <div className="flex items-center justify-center w-full h-full">
                <span className="text-4xl">🎉</span>
            </div>
        </div>
    );
}