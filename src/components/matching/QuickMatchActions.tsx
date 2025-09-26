import Link from 'next/link';

export function QuickMatchActions() {
    return (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">group</span>
                    <div>
                        <h3 className="font-semibold">Study Buddy Matching</h3>
                        <p className="text-sm text-blue-100">Find your perfect study partner</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/matches/request"
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        Find Buddies
                    </Link>
                    <Link
                        href="/matches/results"
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        View Matches
                    </Link>
                </div>
            </div>
        </div>
    );
}