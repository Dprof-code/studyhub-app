import { useState, useEffect, useCallback } from 'react';

interface Job {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
    result?: any;
    createdAt: string;
    updatedAt: string;
}

export function useJobProgress(jobId: string | null) {
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchJobStatus = useCallback(async () => {
        if (!jobId) {
            setJob(null);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/api/jobs?action=status&jobId=${jobId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch job status');
            }

            const jobData = await response.json();
            setJob(jobData);
            setError(null);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            console.error('Error fetching job status:', err);
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        if (!jobId) return;

        // Initial fetch
        fetchJobStatus();

        // Poll for updates if job is not completed
        const interval = setInterval(() => {
            if (job?.status === 'pending' || job?.status === 'processing') {
                fetchJobStatus();
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [jobId, job?.status, fetchJobStatus]);

    const retry = useCallback(async () => {
        if (!jobId) return;

        try {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'retry', jobId })
            });

            if (response.ok) {
                fetchJobStatus();
            }
        } catch (err) {
            console.error('Error retrying job:', err);
        }
    }, [jobId, fetchJobStatus]);

    return {
        job,
        loading,
        error,
        retry,
        isCompleted: job?.status === 'completed',
        isFailed: job?.status === 'failed',
        isProcessing: job?.status === 'processing',
        isPending: job?.status === 'pending'
    };
}

// Hook for managing multiple jobs
export function useMultipleJobs(jobIds: string[]) {
    const [jobs, setJobs] = useState<Record<string, Job>>({});
    const [loading, setLoading] = useState(false);

    const fetchAllJobs = useCallback(async () => {
        if (jobIds.length === 0) return;

        try {
            setLoading(true);
            const promises = jobIds.map(async (jobId) => {
                const response = await fetch(`/api/jobs?action=status&jobId=${jobId}`);
                if (response.ok) {
                    return { jobId, job: await response.json() };
                }
                return null;
            });

            const results = await Promise.all(promises);
            const newJobs: Record<string, Job> = {};

            results.forEach((result) => {
                if (result) {
                    newJobs[result.jobId] = result.job;
                }
            });

            setJobs(newJobs);
        } catch (err) {
            console.error('Error fetching multiple jobs:', err);
        } finally {
            setLoading(false);
        }
    }, [jobIds]);

    useEffect(() => {
        if (jobIds.length > 0) {
            fetchAllJobs();

            // Poll for updates
            const interval = setInterval(() => {
                const hasActiveJobs = Object.values(jobs).some(
                    job => job?.status === 'pending' || job?.status === 'processing'
                );

                if (hasActiveJobs) {
                    fetchAllJobs();
                }
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [jobIds, fetchAllJobs, jobs]);

    return {
        jobs,
        loading,
        getJob: (jobId: string) => jobs[jobId],
        allCompleted: Object.values(jobs).every(job => job?.status === 'completed'),
        hasFailures: Object.values(jobs).some(job => job?.status === 'failed'),
        activeCount: Object.values(jobs).filter(
            job => job?.status === 'pending' || job?.status === 'processing'
        ).length
    };
}