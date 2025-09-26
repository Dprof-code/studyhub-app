'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useGamification } from '@/hooks/useGamification';

// Define allowed file types
const ACCEPTED_FILE_TYPES = {
    'application/pdf': ['.pdf'],
    'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

// Define resource schema
const resourceSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    courseId: z.number().optional(),
    courseName: z.string().optional(),
    tags: z.array(z.string()).min(1, 'Please select at least one tag'),
    fileUrl: z.string().optional(),
    fileType: z.string().optional(),
    year: z.number().optional(),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

const AVAILABLE_TAGS = [
    'past-question',
    'lecture-note',
    'assignment',
    'project',
    'tutorial',
    'concept',
    'topic',
    'reference',
    'example',
];

export default function UploadResources() {
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            router.push('/sign-in');
        },
    });
    const { recordActivity } = useGamification();

    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [courseQuery, setCourseQuery] = useState('');
    const [courseSuggestions, setCourseSuggestions] = useState<Array<{ id: number; code: string; title: string; department: { name: string; faculty: { name: string } } }>>([]);
    const [selectedCourse, setSelectedCourse] = useState<{ id: number; code: string; title: string } | null>(null);
    const debouncedCourseQuery = useDebounce(courseQuery, 300);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        setValue,
        watch,
    } = useForm<ResourceFormData>({
        resolver: zodResolver(resourceSchema),
    });

    // Course search
    useEffect(() => {
        if (!debouncedCourseQuery) {
            setCourseSuggestions([]);
            return;
        }

        const fetchCourseSuggestions = async () => {
            try {
                const response = await fetch(`/api/courses/suggestions?q=${debouncedCourseQuery}`);
                if (response.ok) {
                    const data = await response.json();
                    setCourseSuggestions(data.suggestions);
                }
            } catch (error) {
                console.error('Error fetching course suggestions:', error);
            }
        };

        fetchCourseSuggestions();
    }, [debouncedCourseQuery]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_FILE_TYPES,
        maxSize: 10485760, // 10MB
        multiple: false,
    });

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => {
            const newTags = prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag];
            setValue('tags', newTags);
            return newTags;
        });
    };

    // Update the onSubmit function
    const onSubmit = async (data: ResourceFormData) => {
        if (!file && !data.fileUrl) {
            toast.error('Please upload a file or provide a link');
            return;
        }

        if (!data.courseId && !data.courseName) {
            toast.error('Please select or enter a course');
            return;
        }

        if (selectedTags.includes('past-question') && !data.year) {
            toast.error('Please specify the year for past question');
            return;
        }

        setIsUploading(true);
        try {
            // Handle file upload
            if (file) {
                const formData = new FormData();
                formData.append('file', file);

                const uploadResponse = await fetch('/api/resources/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload file');
                }

                const { fileUrl, fileType } = await uploadResponse.json();
                data.fileUrl = fileUrl;
                data.fileType = fileType;
            }

            // Create resource
            const response = await fetch('/api/resources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    courseName: selectedCourse ? undefined : courseQuery,
                    year: selectedTags.includes('past-question') ? data.year : undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create resource');
            }

            const resource = await response.json();

            // Record activity for gamification
            await recordActivity('RESOURCE_UPLOAD', {
                resourceId: resource.id,
                resourceType: resource.fileType,
                tags: selectedTags
            });

            toast.success('Resource uploaded successfully! +20 XP earned');
            router.push(`/resources/${resource.id}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to upload resource');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="space-y-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Upload Resource</h1>
                        <p className="text-muted-foreground">Share learning materials with your peers</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* File Upload Zone */}
                        <div
                            {...getRootProps()}
                            className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
              `}
                        >
                            <input {...getInputProps()} />
                            <span className="material-symbols-outlined text-4xl mb-2">cloud_upload</span>
                            {file ? (
                                <p className="text-sm">{file.name}</p>
                            ) : (
                                <div className="space-y-2">
                                    <p>Drag & drop a file here, or click to select</p>
                                    <p className="text-sm text-muted-foreground">
                                        Supports PDF, Word, PowerPoint, and images up to 10MB
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Upload Progress */}
                        {isUploading && (
                            <div className="space-y-2">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground text-center">
                                    Uploading... {uploadProgress}%
                                </p>
                            </div>
                        )}

                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="title">
                                Title
                            </label>
                            <Input
                                id="title"
                                {...register('title')}
                                placeholder="Enter resource title"
                            />
                            {errors.title && (
                                <p className="text-sm text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        {/* Course Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="course">
                                Course
                            </label>
                            <div className="relative">
                                <Input
                                    id="course"
                                    value={courseQuery}
                                    onChange={(e) => {
                                        setCourseQuery(e.target.value);
                                        setSelectedCourse(null); // Reset selected course when input changes
                                        setValue('courseId', undefined);
                                        setValue('courseName', undefined);
                                    }}
                                    placeholder="Search for course code (e.g., CSC 101)"
                                />
                                {courseSuggestions.length > 0 && !selectedCourse && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {courseSuggestions.map((course) => (
                                            <div
                                                key={course.id}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedCourse(course);
                                                    setValue('courseId', course.id);
                                                    setCourseQuery(`${course.code} - ${course.title}`);
                                                    setCourseSuggestions([]);
                                                }}
                                            >
                                                <div className="font-medium">{course.code}</div>
                                                <div className="text-sm text-gray-600">{course.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {courseQuery && !selectedCourse && courseSuggestions.length === 0 && !errors.courseId && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
                                        <p className="text-sm text-gray-600">Course not found</p>
                                        <div className="mt-2 flex gap-2">
                                            <Button
                                                type="button"
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    if (window.confirm('Would you like to create this course?')) {
                                                        router.push('/courses/new');
                                                    } else {
                                                        setValue('courseId', undefined);
                                                        setValue('courseName', courseQuery);
                                                    }
                                                }}
                                            >
                                                Create Course
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setValue('courseId', undefined);
                                                    setValue('courseName', courseQuery);
                                                }}
                                            >
                                                Use as Text
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {errors.courseId && (
                                <p className="text-sm text-destructive">{errors.courseId.message}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="description">
                                Description
                            </label>
                            <Textarea
                                id="description"
                                {...register('description')}
                                placeholder="Describe your resource..."
                                className="min-h-[100px]"
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive">{errors.description.message}</p>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tags</label>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_TAGS.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={`
                      px-3 py-1 rounded-full text-sm
                      transition-colors duration-200
                      ${selectedTags.includes(tag)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }
                    `}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            {errors.tags && (
                                <p className="text-sm text-destructive">{errors.tags.message}</p>
                            )}
                        </div>

                        {/* past question year */}
                        {selectedTags.includes('past-question') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium" htmlFor="year">
                                    Question Year
                                </label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        id="year"
                                        type="number"
                                        min={1900}
                                        max={new Date().getFullYear()}
                                        placeholder="Enter year (e.g., 2023)"
                                        {...register('year', {
                                            setValueAs: (v) => v === "" ? undefined : parseInt(v, 10),
                                            validate: (value) => {
                                                if (selectedTags.includes('past-question')) {
                                                    if (!value) return 'Year is required for past questions';
                                                    if (value < 1900 || value > new Date().getFullYear()) {
                                                        return 'Please enter a valid year';
                                                    }
                                                }
                                                return true;
                                            }
                                        })}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {new Date().getFullYear()}
                                    </span>
                                </div>
                                {errors.year && (
                                    <p className="text-sm text-destructive">{errors.year.message}</p>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin mr-2">
                                        progress_activity
                                    </span>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined mr-2">
                                        cloud_upload
                                    </span>
                                    Save & Publish
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}