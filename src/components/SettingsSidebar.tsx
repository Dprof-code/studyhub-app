'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsLinks = [
    {
        href: '/settings/profile',
        label: 'Profile',
        icon: 'person',
    },
    {
        href: '/settings/account',
        label: 'Account',
        icon: 'manage_accounts',
    },
    {
        href: '/settings/notifications',
        label: 'Notifications',
        icon: 'notifications',
    },
    {
        href: '/settings/privacy',
        label: 'Privacy',
        icon: 'security',
    },
];

export function SettingsSidebar() {
    const pathname = usePathname();

    return (
        <nav className="space-y-1">
            {settingsLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`
              flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg
              ${isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted'
                            }
            `}
                    >
                        <span className="material-symbols-outlined">{link.icon}</span>
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}