'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { JobMonitoringDashboard } from '@/components/ai/JobMonitoringDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    Settings,
    Database,
    Activity,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Server,
    Cpu,
    HardDrive,
    Zap
} from 'lucide-react';

interface SystemStatus {
    initialized: boolean;
    queueStats: {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    };
    timestamp: string;
}

export default function AISystemAdminPage() {
    const { data: session, status } = useSession();
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSystemStatus = async () => {
        try {
            const response = await fetch('/api/system/status');
            if (response.ok) {
                const data = await response.json();
                setSystemStatus(data);
            } else {
                setError('Failed to fetch system status');
            }
        } catch (err) {
            setError('Error connecting to system status API');
            console.error('System status error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchSystemStatus();

            // Auto-refresh every 30 seconds
            const interval = setInterval(fetchSystemStatus, 30000);
            return () => clearInterval(interval);
        }
    }, [status]);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Alert className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You must be logged in to access the AI System Administration panel.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">AI System Administration</h1>
                    <p className="text-muted-foreground">
                        Monitor and manage the AI-powered document analysis system
                    </p>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="jobs">Job Queue</TabsTrigger>
                        <TabsTrigger value="performance">Performance</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <SystemOverview
                            systemStatus={systemStatus}
                            loading={loading}
                            error={error}
                            onRefresh={fetchSystemStatus}
                        />
                    </TabsContent>

                    <TabsContent value="jobs" className="space-y-6">
                        <JobMonitoringDashboard />
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-6">
                        <PerformanceMetrics systemStatus={systemStatus} />
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6">
                        <SystemSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

interface SystemOverviewProps {
    systemStatus: SystemStatus | null;
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
}

function SystemOverview({ systemStatus, loading, error, onRefresh }: SystemOverviewProps) {
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>System Status Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">System Overview</h2>
                <Button onClick={onRefresh} disabled={loading} size="sm">
                    <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* System Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            {systemStatus?.initialized ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <span className="text-lg font-semibold text-green-600">Online</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <span className="text-lg font-semibold text-red-600">Offline</span>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {systemStatus ? systemStatus.queueStats.processing + systemStatus.queueStats.pending : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Processing + Pending
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {systemStatus ? (
                                systemStatus.queueStats.total > 0
                                    ? Math.round((systemStatus.queueStats.completed / systemStatus.queueStats.total) * 100)
                                    : 0
                            ) : '—'}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Completed successfully
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {systemStatus?.queueStats.total || '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All time jobs
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Queue Status Details */}
            {systemStatus && (
                <Card>
                    <CardHeader>
                        <CardTitle>Queue Status Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {systemStatus.queueStats.total}
                                </div>
                                <Badge variant="outline">Total</Badge>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {systemStatus.queueStats.pending}
                                </div>
                                <Badge variant="secondary">Pending</Badge>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {systemStatus.queueStats.processing}
                                </div>
                                <Badge variant="default">Processing</Badge>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {systemStatus.queueStats.completed}
                                </div>
                                <Badge variant="default">Completed</Badge>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">
                                    {systemStatus.queueStats.failed}
                                </div>
                                <Badge variant="destructive">Failed</Badge>
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                            Last updated: {new Date(systemStatus.timestamp).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function PerformanceMetrics({ systemStatus }: { systemStatus: SystemStatus | null }) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Performance Metrics</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—%</div>
                        <p className="text-xs text-muted-foreground">
                            Feature coming soon
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—MB</div>
                        <p className="text-xs text-muted-foreground">
                            Feature coming soon
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—s</div>
                        <p className="text-xs text-muted-foreground">
                            Feature coming soon
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Performance Monitoring</AlertTitle>
                <AlertDescription>
                    Advanced performance metrics will be available in a future update.
                    Currently showing basic queue statistics only.
                </AlertDescription>
            </Alert>
        </div>
    );
}

function SystemSettings() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">System Settings</h2>

            <Alert>
                <Settings className="h-4 w-4" />
                <AlertTitle>Configuration</AlertTitle>
                <AlertDescription>
                    System configuration options will be available in a future update.
                    Current settings are managed through environment variables.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Environment Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div><strong>GEMINI_API_KEY:</strong> {process.env.GEMINI_API_KEY ? 'Configured ✓' : 'Not Set ✗'}</div>
                        <div><strong>Database:</strong> Connected ✓</div>
                        <div><strong>Job Queue:</strong> In-Memory (Upgrade to Redis recommended for production)</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}