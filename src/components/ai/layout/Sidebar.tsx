/**
 * AI Dashboard Sidebar Component
 * Phase 5A: Advanced UI Features - Foundation
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    ChartBarIcon,
    AcademicCapIcon,
    BoltIcon,
    BookOpenIcon,
    CogIcon,
    XMarkIcon,
    Bars3Icon,
    CpuChipIcon,
    MapIcon,
    CalendarDaysIcon,
    QuestionMarkCircleIcon,
    PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

const navigation = [
    {
        name: 'AI Overview',
        href: '/dashboard/ai',
        icon: HomeIcon,
        description: 'AI-powered learning insights'
    },
    {
        name: 'Concept Maps',
        href: '/ai/concepts',
        icon: MapIcon,
        description: 'Interactive concept relationships'
    },
    {
        name: 'Study Planner',
        href: '/ai/study-plan',
        icon: CalendarDaysIcon,
        description: 'AI-generated study schedules'
    },
    {
        name: 'Question Hub',
        href: '/ai/questions',
        icon: QuestionMarkCircleIcon,
        description: 'Intelligent question analysis'
    },
    {
        name: 'Course Analytics',
        href: '/ai/course-analysis',
        icon: PresentationChartBarIcon,
        description: 'Comprehensive course insights'
    },
    {
        name: 'AI Processing',
        href: '/ai/processing',
        icon: CpuChipIcon,
        description: 'Background AI operations'
    }
];

const bottomNavigation = [
    { name: 'Settings', href: '/ai/settings', icon: CogIcon },
    { name: 'Back to Main', href: '/dashboard', icon: AcademicCapIcon }
];

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile menu button */}
            <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white dark:bg-gray-800 px-4 py-4 shadow-sm sm:px-6 lg:hidden">
                <button
                    type="button"
                    className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-200 lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                >
                    <span className="sr-only">Open sidebar</span>
                    <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                </button>
                <div className="flex-1 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                    AI Dashboard
                </div>
            </div>

            {/* Sidebar for mobile */}
            <div className={classNames(
                'fixed inset-y-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-in-out lg:hidden',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                className
            )}>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 px-6 pb-4 border-r border-gray-200 dark:border-gray-700">
                    <div className="flex h-16 shrink-0 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BoltIcon className="h-8 w-8 text-blue-600" />
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                AI Hub
                            </span>
                        </div>
                        <button
                            type="button"
                            className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-200"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className="sr-only">Close sidebar</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                    <SidebarContent pathname={pathname} />
                </div>
            </div>

            {/* Static sidebar for desktop */}
            <div className={classNames(
                'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col',
                className
            )}>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 px-6 border-r border-gray-200 dark:border-gray-700">
                    <div className="flex h-16 shrink-0 items-center gap-2">
                        <BoltIcon className="h-8 w-8 text-blue-600" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                            AI Hub
                        </span>
                    </div>
                    <SidebarContent pathname={pathname} />
                </div>
            </div>
        </>
    );
}

function SidebarContent({ pathname }: { pathname: string }) {
    return (
        <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                    <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        AI Features
                    </div>
                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={classNames(
                                            isActive
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400',
                                            'group flex gap-x-3 rounded-md p-3 text-sm font-medium leading-6 transition-all duration-200'
                                        )}
                                    >
                                        <item.icon
                                            className={classNames(
                                                isActive
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400',
                                                'h-5 w-5 shrink-0 transition-colors duration-200'
                                            )}
                                            aria-hidden="true"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate">{item.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {item.description}
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </li>

                <li className="mt-auto">
                    <div className="text-xs font-semibold leading-6 text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Navigation
                    </div>
                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                        {bottomNavigation.map((item) => (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-all duration-200"
                                >
                                    <item.icon
                                        className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 h-5 w-5 shrink-0 transition-colors duration-200"
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </li>
            </ul>
        </nav>
    );
}