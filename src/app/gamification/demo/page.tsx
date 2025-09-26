import { Metadata } from 'next';
import GamificationDemo from '@/components/gamification/GamificationDemo';

export const metadata: Metadata = {
    title: 'Gamification Demo - StudyHub',
    description: 'Explore all the gamification features integrated into StudyHub including XP, achievements, leaderboards, and voting.',
};

export default function GamificationDemoPage() {
    return <GamificationDemo />;
}