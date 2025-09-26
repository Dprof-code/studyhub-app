'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { NavigationSidebar } from './NavigationSidebar';
import { UserMenu } from './UserMenu';
import { CreateMenu } from './CreateMenu';
import { Search } from './Search';
import { GamificationWidget } from '@/components/gamification';

export function Navigation() {
    const { data: session } = useSession();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <header className="sticky top-0 z-[250] w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center px-4">
                {/* Left section */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(true)}
                        className="shrink-0"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </Button>

                    <Link href="/" className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-2xl">hub</span>
                        <span className="font-semibold text-xl hidden md:inline-block">StudyHub</span>
                    </Link>

                    <div className="h-6 w-px bg-border mx-4" />

                    <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
                </div>

                {/* Right section */}
                <div className="ml-auto flex items-center gap-4">
                    <Search />

                    {session ? (
                        <>
                            {/* Gamification Quick Stats */}
                            <div className="hidden lg:block">
                                <GamificationWidget type="quick-stats" />
                            </div>

                            <CreateMenu />
                            <UserMenu user={session.user} />
                        </>
                    ) : (
                        <Link href="/sign-in">
                            <Button>Sign In</Button>
                        </Link>
                    )}
                </div>
            </div>

            <NavigationSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
        </header>
    );
}