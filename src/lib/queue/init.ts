// Job Queue Initialization
// This file initializes the AI job processing system

import { aiJobProcessors } from './aiProcessors';
import { jobQueue } from './jobQueue';

let initialized = false;

/**
 * Initialize the job processing system
 * Call this once when the application starts
 */
export function initializeJobSystem() {
    if (initialized) {
        console.log('Job system already initialized');
        return;
    }

    try {
        // Initialize AI job processors
        aiJobProcessors.init();

        // Set up periodic cleanup (runs every hour)
        setInterval(() => {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            jobQueue.cleanup(oneWeekAgo);
            console.log('Job queue cleanup completed');
        }, 60 * 60 * 1000); // Every hour

        initialized = true;
        console.log('🚀 AI Job Processing System initialized successfully');

    } catch (error) {
        console.error('❌ Failed to initialize job system:', error);
        throw error;
    }
}

/**
 * Get system status
 */
export async function getSystemStatus() {
    const stats = await jobQueue.getStats();

    return {
        initialized,
        queueStats: stats,
        timestamp: new Date().toISOString()
    };
}

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
    initializeJobSystem();
}