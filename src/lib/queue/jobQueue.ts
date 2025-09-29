// Job Queue System for AI Processing
// This is a simplified in-memory implementation that can be upgraded to Redis/Bull later

export interface Job<T = any> {
    id: string;
    type: string;
    data: T;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    result?: any;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    attempts: number;
    maxAttempts: number;
}

export interface JobProcessor<T = any> {
    (job: Job<T>): Promise<any>;
}

class JobQueue {
    private jobs: Map<string, Job> = new Map();
    private processors: Map<string, JobProcessor> = new Map();
    private processing: Set<string> = new Set();
    private listeners: Map<string, ((job: Job) => void)[]> = new Map();

    /**
     * Add a job to the queue
     */
    async add<T>(type: string, data: T, options: {
        maxAttempts?: number;
        delay?: number;
    } = {}): Promise<Job<T>> {
        const job: Job<T> = {
            id: this.generateId(),
            type,
            data,
            status: 'pending',
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            attempts: 0,
            maxAttempts: options.maxAttempts || 3
        };

        this.jobs.set(job.id, job);

        // Emit job added event
        this.emit(`job:${job.id}:added`, job);
        this.emit('job:added', job);

        // Process immediately if delay is not specified
        if (!options.delay) {
            setImmediate(() => this.processJob(job.id));
        } else {
            setTimeout(() => this.processJob(job.id), options.delay);
        }

        return job;
    }

    /**
     * Register a processor for a job type
     */
    process<T>(type: string, processor: JobProcessor<T>): void {
        this.processors.set(type, processor);
    }

    /**
     * Get job by ID
     */
    async getJob(id: string): Promise<Job | null> {
        return this.jobs.get(id) || null;
    }

    /**
     * Get jobs by status
     */
    async getJobs(status?: Job['status']): Promise<Job[]> {
        const allJobs = Array.from(this.jobs.values());
        return status ? allJobs.filter(job => job.status === status) : allJobs;
    }

    /**
     * Process a specific job
     */
    private async processJob(jobId: string): Promise<void> {
        const job = this.jobs.get(jobId);
        if (!job || this.processing.has(jobId)) {
            return;
        }

        const processor = this.processors.get(job.type);
        if (!processor) {
            console.error(`No processor found for job type: ${job.type}`);
            return;
        }

        this.processing.add(jobId);
        job.status = 'processing';
        job.updatedAt = new Date();
        job.attempts++;

        this.emit(`job:${jobId}:processing`, job);
        this.emit('job:processing', job);

        try {
            // Update progress periodically during processing
            const progressInterval = setInterval(() => {
                if (job.progress < 90) {
                    job.progress = Math.min(90, job.progress + Math.random() * 10);
                    job.updatedAt = new Date();
                    this.emit(`job:${jobId}:progress`, job);
                }
            }, 1000);

            const result = await processor(job);

            clearInterval(progressInterval);

            job.status = 'completed';
            job.progress = 100;
            job.result = result;
            job.updatedAt = new Date();

            this.emit(`job:${jobId}:completed`, job);
            this.emit('job:completed', job);

        } catch (error) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : String(error);
            job.updatedAt = new Date();

            // Retry if attempts haven't exceeded max
            if (job.attempts < job.maxAttempts) {
                job.status = 'pending';
                setTimeout(() => this.processJob(jobId), 5000); // Retry after 5 seconds
            }

            this.emit(`job:${jobId}:failed`, job);
            this.emit('job:failed', job);

        } finally {
            this.processing.delete(jobId);
        }
    }

    /**
     * Add event listener
     */
    on(event: string, listener: (job: Job) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(listener);
    }

    /**
     * Remove event listener
     */
    off(event: string, listener: (job: Job) => void): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    private emit(event: string, job: Job): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(listener => listener(job));
        }
    }

    /**
     * Generate unique job ID
     */
    private generateId(): string {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up old jobs
     */
    async cleanup(olderThan: Date): Promise<void> {
        const jobsToDelete: string[] = [];

        for (const [id, job] of this.jobs.entries()) {
            if (job.updatedAt < olderThan && (job.status === 'completed' || job.status === 'failed')) {
                jobsToDelete.push(id);
            }
        }

        jobsToDelete.forEach(id => this.jobs.delete(id));
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<{
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    }> {
        const allJobs = Array.from(this.jobs.values());

        return {
            total: allJobs.length,
            pending: allJobs.filter(job => job.status === 'pending').length,
            processing: allJobs.filter(job => job.status === 'processing').length,
            completed: allJobs.filter(job => job.status === 'completed').length,
            failed: allJobs.filter(job => job.status === 'failed').length,
        };
    }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Job Types
export const JOB_TYPES = {
    EXTRACT_QUESTIONS: 'extract-questions',
    IDENTIFY_CONCEPTS: 'identify-concepts',
    UPDATE_RAG_INDEX: 'update-rag-index',
    GENERATE_STUDY_PLAN: 'generate-study-plan',
    ANALYZE_DOCUMENT: 'analyze-document'
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];