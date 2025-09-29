/**
 * AI Dashboard Layout Component
 * Phase 5A: Advanced UI Features - Foundation
 */
import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';

interface AIDashboardLayoutProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    actions?: ReactNode;
}

export function AIDashboardLayout({
    children,
    title,
    subtitle,
    breadcrumbs,
    actions
}: AIDashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="lg:ml-64">
                {/* Top Header */}
                <Header />

                {/* Page Header */}
                <div className="sticky top-16 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 lg:px-8">
                    {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

                    <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            {title && (
                                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white truncate">
                                    {title}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        {actions && (
                            <div className="flex items-center gap-3">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <main className="px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}