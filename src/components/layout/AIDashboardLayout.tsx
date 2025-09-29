'use client';

import React from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Brain,
    MessageSquare,
    Network,
    BookOpen,
    BarChart3,
    Settings,
    Home,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIDashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

const aiNavItems = [
    {
        title: 'Overview',
        href: '/dashboard/ai',
        icon: Home,
        description: 'AI system overview and quick stats'
    },
    {
        title: 'AI Chat',
        href: '/dashboard/ai/chat',
        icon: MessageSquare,
        description: 'Conversational AI assistant'
    },
    {
        title: 'Concept Map',
        href: '/dashboard/ai/concepts',
        icon: Network,
        description: 'Interactive concept relationships'
    },
    {
        title: 'Study Planner',
        href: '/dashboard/ai/study-plan',
        icon: BookOpen,
        description: 'AI-generated study plans'
    },
    {
        title: 'Course Analysis',
        href: '/dashboard/ai/course-analysis',
        icon: BarChart3,
        description: 'Deep course content analysis'
    },
    {
        title: 'Question Hub',
        href: '/dashboard/ai/questions',
        icon: Brain,
        description: 'Smart question analysis'
    },
];

export function AIDashboardLayout({ children, title, description }: AIDashboardLayoutProps) {
    const pathname = usePathname();

    const getCurrentPageInfo = () => {
        const currentItem = aiNavItems.find(item => item.href === pathname);
        return currentItem || { title: 'AI Dashboard', description: 'AI-powered learning tools' };
    };

    const pageInfo = getCurrentPageInfo();
    const displayTitle = title || pageInfo.title;
    const displayDescription = description || pageInfo.description;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />

            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                        <Link href="/dashboard" className="hover:text-gray-700">
                            Dashboard
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <Link href="/dashboard/ai" className="hover:text-gray-700">
                            AI Tools
                        </Link>
                        {pathname !== '/dashboard/ai' && (
                            <>
                                <ChevronRight className="h-4 w-4" />
                                <span className="text-gray-900">{displayTitle}</span>
                            </>
                        )}
                    </nav>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>
                                {displayTitle}
                            </h1>
                            <p className="text-gray-600 mt-2">{displayDescription}</p>
                        </div>

                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            AI Powered
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">AI Tools</CardTitle>
                                <CardDescription>
                                    Explore our AI-powered learning features
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <nav className="space-y-1">
                                    {aiNavItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = pathname === item.href;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50",
                                                    isActive
                                                        ? "bg-purple-50 text-purple-700 border-r-2 border-purple-700"
                                                        : "text-gray-700 hover:text-gray-900"
                                                )}
                                            >
                                                <Icon className={cn(
                                                    "h-4 w-4",
                                                    isActive ? "text-purple-700" : "text-gray-500"
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">{item.title}</div>
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {item.description}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </CardContent>
                        </Card>

                        {/* Quick Stats Card */}
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-lg">AI Usage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Queries Today</span>
                                        <Badge variant="outline">42</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Concepts Mapped</span>
                                        <Badge variant="outline">1,247</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Study Plans</span>
                                        <Badge variant="outline">8</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="space-y-6">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AIDashboardLayout;