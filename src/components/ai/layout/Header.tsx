/**
 * AI Dashboard Header Component
 * Phase 5A: Advanced UI Features - Foundation
 */
'use client';

import { Fragment } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Menu, Transition } from '@headlessui/react';
import {
    BellIcon,
    SunIcon,
    MoonIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';
import { useTheme } from 'next-themes';

export function Header() {
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
                {/* Search area */}
                <div className="flex flex-1 items-center">
                    {/* We can add a search bar here later */}
                </div>

                {/* Right side items */}
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {/* Theme toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
                    >
                        <span className="sr-only">Toggle theme</span>
                        {theme === 'dark' ? (
                            <SunIcon className="h-6 w-6" aria-hidden="true" />
                        ) : (
                            <MoonIcon className="h-6 w-6" aria-hidden="true" />
                        )}
                    </button>

                    {/* Notifications */}
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
                    >
                        <span className="sr-only">View notifications</span>
                        <BellIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Separator */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-gray-700" />

                    {/* Profile dropdown */}
                    <Menu as="div" className="relative">
                        <Menu.Button className="-m-1.5 flex items-center p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200">
                            <span className="sr-only">Open user menu</span>
                            {session?.user?.image ? (
                                <img
                                    className="h-8 w-8 rounded-full"
                                    src={session.user.image}
                                    alt={session.user.name || 'User avatar'}
                                />
                            ) : (
                                <UserCircleIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                            )}
                            <span className="hidden lg:flex lg:items-center lg:ml-2">
                                <span className="text-sm font-semibold leading-6 text-gray-900 dark:text-white" aria-hidden="true">
                                    {session?.user?.firstname || 'User'}
                                </span>
                            </span>
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 z-10 mt-2.5 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 py-2 shadow-lg ring-1 ring-gray-900/5 dark:ring-gray-700 focus:outline-none">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                                        {session?.user?.name || `${session?.user?.firstname} ${session?.user?.lastname}`}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {session?.user?.email}
                                    </p>
                                </div>

                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href="/profile"
                                            className={classNames(
                                                active ? 'bg-gray-50 dark:bg-gray-700' : '',
                                                'flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300'
                                            )}
                                        >
                                            <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                            Your Profile
                                        </Link>
                                    )}
                                </Menu.Item>

                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href="/settings"
                                            className={classNames(
                                                active ? 'bg-gray-50 dark:bg-gray-700' : '',
                                                'flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300'
                                            )}
                                        >
                                            <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                            Settings
                                        </Link>
                                    )}
                                </Menu.Item>

                                <div className="border-t border-gray-100 dark:border-gray-700 mt-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => signOut()}
                                                className={classNames(
                                                    active ? 'bg-gray-50 dark:bg-gray-700' : '',
                                                    'flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300'
                                                )}
                                            >
                                                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                Sign out
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>
        </div>
    );
}