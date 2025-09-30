'use client';

import { useEffect } from 'react';

// Initialize job system on client-side
export default function JobSystemInit() {
    useEffect(() => {
        // Initialize the job system
        const initJobSystem = async () => {
            try {
                const response = await fetch('/api/system/init', {
                    method: 'POST',
                });
                if (response.ok) {
                    console.log('Job system initialized successfully');
                } else {
                    console.error('Failed to initialize job system');
                }
            } catch (error) {
                console.error('Error initializing job system:', error);
            }
        };

        initJobSystem();
    }, []);

    return null; // This component doesn't render anything
}