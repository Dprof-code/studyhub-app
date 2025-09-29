'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle2, XCircle, Clock, Zap, Activity, TrendingUp } from 'lucide-react';

interface Job {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    createdAt: string;
    updatedAt: string;
    attempts: number;
    error?: string;
    result?: any;
}

interface QueueStats {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
}

export function JobMonitoringDashboard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = async () => {
        try {
            const response = await fetch('/api/jobs?action=list');
            if (!response.ok) throw new Error('Failed to fetch jobs');
            const data = await response.json();
            setJobs(data.jobs || []);
        } catch (err) {
            setError('Failed to fetch jobs');
            console.error('Error fetching jobs:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/jobs?action=stats');
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data.stats);
        } catch (err) {
            setError('Failed to fetch stats');
            console.error('Error fetching stats:', err);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([fetchJobs(), fetchStats()]);
        } finally {
            setLoading(false);
        }
    };

    const retryJob = async (jobId: string) => {
        try {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'retry', jobId })
            });

            if (response.ok) {
                refreshData();
            }
        } catch (err) {
            console.error('Error retrying job:', err);
        }
    };

    useEffect(() => {
        refreshData();

        // Auto-refresh every 5 seconds
        const interval = setInterval(refreshData, 5000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: Job['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'processing':
                return <Zap className="h-4 w-4 text-blue-500 animate-pulse" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusBadge = (status: Job['status']) => {
        const variants = {
            completed: 'default',
            failed: 'destructive',
            processing: 'default',
            pending: 'secondary'
        } as const;

        return (
            <Badge variant={variants[status]} className="flex items-center gap-1">
                {getStatusIcon(status)}
                {status.toUpperCase()}
            </Badge>
        );
    };

    if (loading && !jobs.length) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading job monitoring dashboard...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">AI Job Monitoring</h2>
                    <p className="text-muted-foreground">Monitor background AI processing tasks</p>
                </div>
                <Button onClick={refreshData} disabled={loading} size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700">
                    {error}
                </div>
            )}

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Processing</CardTitle>
                            <Zap className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Failed</CardTitle>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Jobs List */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Jobs</CardTitle>
                    <CardDescription>
                        Latest AI processing tasks and their status
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList>
                            <TabsTrigger value="all">All Jobs</TabsTrigger>
                            <TabsTrigger value="processing">Processing</TabsTrigger>
                            <TabsTrigger value="failed">Failed</TabsTrigger>
                            <TabsTrigger value="completed">Completed</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="space-y-4 mt-4">
                            {jobs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No jobs found
                                </div>
                            ) : (
                                jobs.map((job) => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        onRetry={retryJob}
                                    />
                                ))
                            )}
                        </TabsContent>

                        {(['processing', 'failed', 'completed'] as const).map((status) => (
                            <TabsContent key={status} value={status} className="space-y-4 mt-4">
                                {jobs.filter(job => job.status === status).map((job) => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        onRetry={retryJob}
                                    />
                                ))}
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

interface JobCardProps {
    job: Job;
    onRetry: (jobId: string) => void;
}

function JobCard({ job, onRetry }: JobCardProps) {
    return (
        <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Badge variant="outline">{job.type}</Badge>
                    {getStatusBadge(job.status)}
                </div>
                <div className="text-sm text-muted-foreground">
                    {new Date(job.updatedAt).toLocaleString()}
                </div>
            </div>

            {(job.status === 'processing' || job.status === 'completed') && (
                <Progress value={job.progress} className="w-full" />
            )}

            {job.status === 'processing' && (
                <div className="text-sm text-muted-foreground">
                    Progress: {job.progress}%
                </div>
            )}

            {job.error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    Error: {job.error}
                </div>
            )}

            {job.result && job.status === 'completed' && (
                <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    Completed: {JSON.stringify(job.result, null, 2).substring(0, 100)}...
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>ID: {job.id.substring(0, 12)}...</span>
                <div className="flex items-center gap-2">
                    <span>Attempts: {job.attempts}</span>
                    {job.status === 'failed' && (
                        <Button size="sm" variant="outline" onClick={() => onRetry(job.id)}>
                            Retry
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function getStatusBadge(status: Job['status']) {
    const variants = {
        completed: 'default',
        failed: 'destructive',
        processing: 'default',
        pending: 'secondary'
    } as const;

    const getStatusIcon = (status: Job['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-3 w-3 text-green-500" />;
            case 'failed':
                return <XCircle className="h-3 w-3 text-red-500" />;
            case 'processing':
                return <Zap className="h-3 w-3 text-blue-500 animate-pulse" />;
            default:
                return <Clock className="h-3 w-3 text-yellow-500" />;
        }
    };

    return (
        <Badge variant={variants[status]} className="flex items-center gap-1">
            {getStatusIcon(status)}
            {status.toUpperCase()}
        </Badge>
    );
}