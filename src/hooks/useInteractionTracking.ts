import { useCallback } from 'react';

export interface UserInteraction {
    resourceId: number;
    interactionType: 'view' | 'download' | 'vote' | 'comment';
}

export function useInteractionTracking() {
    const trackInteraction = useCallback(async (interaction: UserInteraction) => {
        try {
            await fetch(`/api/resources/${interaction.resourceId}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resourceId: interaction.resourceId,
                    interactionType: interaction.interactionType,
                }),
            });
        } catch (error) {
            console.error('Failed to track interaction:', error);
        }
    }, []);

    const trackView = useCallback((resourceId: number) => {
        trackInteraction({ resourceId, interactionType: 'view' });
    }, [trackInteraction]);

    const trackDownload = useCallback((resourceId: number) => {
        trackInteraction({ resourceId, interactionType: 'download' });
    }, [trackInteraction]);

    return {
        trackInteraction,
        trackView,
        trackDownload,
    };
}