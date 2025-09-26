'use client';

import { useGamification } from '@/hooks/useGamification';
import UserStatsDisplay from './UserStatsDisplay';
import ContentVoting from './ContentVoting';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Target } from 'lucide-react';

interface GamificationWidgetProps {
    type: 'stats' | 'voting' | 'quick-stats';
    userId?: string;
    contentId?: number;
    contentType?: 'resource' | 'post' | 'comment';
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
}

export default function GamificationWidget({
    type,
    userId,
    contentId,
    contentType,
    size = 'md',
    showDetails = false
}: GamificationWidgetProps) {
    const { stats, loading } = useGamification(userId);

    if (loading && type !== 'voting') {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
        );
    }

    switch (type) {
        case 'stats':
            if (!userId) {
                return <div className="text-gray-500 text-sm">No user ID provided</div>;
            }
            return (
                <UserStatsDisplay
                    userId={parseInt(userId)}
                    variant={size === 'sm' ? 'minimal' : size === 'lg' ? 'full' : 'compact'}
                />
            );

        case 'voting':
            if (!contentId || !contentType) {
                return <div className="text-red-500 text-sm">Missing content ID or type for voting</div>;
            }
            return (
                <ContentVoting
                    contentId={contentId}
                    contentType={contentType}
                    size={size}
                    showDetails={showDetails}
                />
            );

        case 'quick-stats':
            if (!stats) return null;
            return (
                <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="flex items-center space-x-1">
                        <Zap className="h-3 w-3" />
                        <span>Lvl {stats.level}</span>
                    </Badge>
                    <Badge variant="outline" className="flex items-center space-x-1">
                        <Trophy className="h-3 w-3" />
                        <span>{stats.reputationScore} Rep</span>
                    </Badge>
                    {stats.streak > 0 && (
                        <Badge variant="outline" className="flex items-center space-x-1">
                            <Target className="h-3 w-3" />
                            <span>{stats.streak} Day Streak</span>
                        </Badge>
                    )}
                </div>
            );

        default:
            return null;
    }
}