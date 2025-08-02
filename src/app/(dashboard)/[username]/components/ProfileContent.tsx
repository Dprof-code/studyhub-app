export function ProfileContent({
    activeTab,
    username
}: {
    activeTab: string;
    username: string;
}) {
    return (
        <div className="space-y-6">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="bg-card rounded-lg border border-border p-4">
                        <h2 className="font-semibold mb-4">Recent Activity</h2>
                        {/* Add activity content */}
                    </div>

                    {/* Popular Repositories */}
                    <div className="bg-card rounded-lg border border-border p-4">
                        <h2 className="font-semibold mb-4">Popular Projects</h2>
                        {/* Add projects content */}
                    </div>
                </div>
            )}
        </div>
    );
}