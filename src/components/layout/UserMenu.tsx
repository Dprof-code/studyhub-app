'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';

export function UserMenu({ user }: { user: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:opacity-80"
                aria-controls="drawer-user-menu"
                aria-expanded={isOpen}
            >
                <Avatar
                    size="sm"
                    src={user.image || '/avatar.jpg'}
                    alt={user.name || 'User avatar'}
                />
            </button>

            {isOpen && (
                <>
                    {/* Drawer component */}
                    <div
                        id="drawer-user-menu"
                        className={`fixed top-0 right-0 z-[200] h-screen w-80 bg-background border-l border-border shadow-lg transition-all duration-300 ease-in-out ${isOpen
                            ? 'translate-x-0'
                            : 'translateX(100%)'
                            }`}
                        tabIndex={-1}
                        aria-labelledby="drawer-user-menu-label"
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        size="md"
                                        src={user.image || '/avatar.jpg'}
                                        alt={user.name || 'User avatar'}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h5
                                            id="drawer-user-menu-label"
                                            className="text-base font-semibold text-foreground truncate"
                                        >
                                            {user.firstname} {user.lastname}
                                        </h5>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 inline-flex items-center"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                    <span className="sr-only">Close menu</span>
                                </button>
                            </div>

                            {/* Menu Items */}
                            <nav className="flex-1 overflow-y-auto p-4">
                                <ul className="space-y-2">
                                    <li>
                                        <Link
                                            href={`/${user.username}`}
                                            className="flex items-center p-2 text-foreground rounded-lg hover:bg-muted group"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <span className="material-symbols-outlined text-muted-foreground group-hover:text-foreground">
                                                person
                                            </span>
                                            <span className="ms-3">Profile</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={`/settings/profile/${user.username}`}
                                            className="flex items-center p-2 text-foreground rounded-lg hover:bg-muted group"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <span className="material-symbols-outlined text-muted-foreground group-hover:text-foreground">
                                                settings
                                            </span>
                                            <span className="ms-3">Settings</span>
                                        </Link>
                                    </li>
                                    <li className="border-t border-border pt-2 mt-2">
                                        <button
                                            onClick={() => {
                                                setIsOpen(false);
                                                signOut();
                                            }}
                                            className="flex items-center w-full p-2 text-destructive rounded-lg hover:bg-destructive/10 group"
                                        >
                                            <span className="material-symbols-outlined">
                                                logout
                                            </span>
                                            <span className="ms-3">Sign Out</span>
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>

                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => setIsOpen(false)}
                    />
                </>
            )}
        </div>
    );
}