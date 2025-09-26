'use client';

import { useRouter, usePathname } from 'next/navigation';

const menuItems = [
    { icon: 'home', label: 'Home', href: '/home' },
    { icon: 'school', label: 'Courses', href: '/courses' },
    { icon: 'library_books', label: 'Resources', href: '/resources' },
    { icon: 'group', label: 'Find Study Buddies', href: '/matches/request' },
    { icon: 'search', label: 'Browse Available', href: '/matches/browse' },
    { icon: 'diversity_3', label: 'My Matches', href: '/matches/my-matches' },
    { icon: 'groups', label: 'Study Groups', href: '/groups' },
    { icon: 'forum', label: 'Discussions', href: '/discussions' },
    { icon: 'emoji_events', label: 'Achievements', href: '/gamification' },
];

export function NavigationSidebar({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <>
            {isOpen && (
                <>
                    {/* Drawer component */}
                    <div
                        id="drawer-navigation"
                        className="fixed top-0 left-0 z-[200] h-screen w-80 bg-background border-r border-border shadow-lg transform transition-transform duration-300 ease-in-out"
                        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
                        tabIndex={-1}
                        aria-labelledby="drawer-navigation-label"
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-3xl">hub</span>
                                    <h5
                                        id="drawer-navigation-label"
                                        className="text-xl font-semibold text-foreground"
                                    >
                                        StudyHub
                                    </h5>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 inline-flex items-center"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                    <span className="sr-only">Close menu</span>
                                </button>
                            </div>

                            {/* Menu Items */}
                            <nav className="flex-1 overflow-y-auto p-4">
                                <ul className="space-y-2">
                                    {menuItems.map((item) => (
                                        <li key={item.href}>
                                            <button
                                                onClick={() => {
                                                    router.push(item.href);
                                                    onClose();
                                                }}
                                                className={`
                                                    w-full flex items-center gap-3 px-3 py-2 rounded-lg
                                                    text-sm font-medium transition-colors group
                                                    ${pathname === item.href
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'text-foreground hover:bg-muted'
                                                    }
                                                `}
                                            >
                                                <span className={`material-symbols-outlined ${pathname === item.href
                                                    ? 'text-primary-foreground'
                                                    : 'text-muted-foreground group-hover:text-foreground'
                                                    }`}>
                                                    {item.icon}
                                                </span>
                                                {item.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>
                    </div>

                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm transition-opacity duration-300"
                        onClick={onClose}
                    />
                </>
            )}
        </>
    );
}