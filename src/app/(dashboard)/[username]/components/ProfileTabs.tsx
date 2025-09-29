type Tab = {
    id: string;
    label: string;
    icon: string;
};

const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'courses', label: 'Courses', icon: 'school' },
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'assignments', label: 'Assignments', icon: 'assignment' },
    { id: 'contributions', label: 'Contributions', icon: 'trending_up' },
];

export function ProfileTabs({
    activeTab,
    onTabChange
}: {
    activeTab: string;
    onTabChange: (tab: string) => void;
}) {
    console.log(activeTab);
    return (
        <div className="border-b border-border mb-6">
            <nav className="flex space-x-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
              flex items-center gap-2 px-1 py-4 border-b-2 text-sm font-medium
              ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                            }
            `}
                    >
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    );
}