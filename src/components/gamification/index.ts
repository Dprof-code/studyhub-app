// Main components
export { default as GamificationDashboard } from './GamificationDashboard';
export { default as UserStatsDisplay } from './UserStatsDisplay';
export { default as AchievementsDisplay } from './AchievementsDisplay';
export { default as Leaderboard } from './Leaderboard';
export { default as ContentVoting } from './ContentVoting';

// Utility components
export { default as GamificationWidget } from './GamificationWidget';
export { default as ActivityTracker, TrackPageView, TrackResourceView, TrackDiscussionView } from './ActivityTracker';
export { default as GamificationDemo } from './GamificationDemo';

// Hooks
export { useGamification, useQuickStats, useAchievementProgress } from '../../hooks/useGamification';

// Types (you can add these if needed)
export type GamificationWidgetProps = {
    type: 'stats' | 'voting' | 'quick-stats';
    userId?: string;
    contentId?: number;
    contentType?: 'resource' | 'post' | 'comment';
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
};