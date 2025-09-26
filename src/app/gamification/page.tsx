import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import GamificationDashboard from '@/components/gamification/GamificationDashboard';

export const metadata: Metadata = {
    title: 'Gamification - StudyHub',
    description: 'Track your progress, earn achievements, and compete with peers in the StudyHub community.',
};

export default function GamificationPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Demo Link */}
            <div className="mb-6 text-center">
                <Link href="/gamification/demo">
                    <Button variant="outline" size="sm">
                        🎮 View Demo & Integration Examples
                    </Button>
                </Link>
            </div>

            <GamificationDashboard />
        </div>
    );
}