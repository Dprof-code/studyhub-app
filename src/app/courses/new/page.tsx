'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useDebounce } from '@/hooks/useDebounce';

// Define the schema for course creation
const courseSchema = z.object({
    code: z.string()
        .min(2, 'Course code is required')
        .max(10, 'Course code must be less than 10 characters')
        .regex(/^[A-Z]{3,4}\s?\d{3}$/, 'Course code must be in format: ABC 123 or ABC123'),
    title: z.string()
        .min(3, 'Course title must be at least 3 characters')
        .max(100, 'Course title must be less than 100 characters'),
    synopsis: z.string()
        .min(10, 'Synopsis must be at least 10 characters'),
    faculty: z.object({
        name: z.string().min(2, 'Faculty name is required'),
        id: z.number().optional()
    }),
    department: z.object({
        name: z.string().min(2, 'Department name is required'),
        id: z.number().optional()
    }),
});

type CourseFormData = z.infer<typeof courseSchema>;

export default function NewCoursePage() {
    const router = useRouter();
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            router.push('/sign-in');
        },
    });

    //console.log('Session data:', session);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [departmentQuery, setDepartmentQuery] = useState('');
    const [facultyQuery, setFacultyQuery] = useState('');
    const [departmentSuggestions, setDepartmentSuggestions] = useState<Array<{ id: number; name: string; facultyId: number }>>([]);
    const [facultySuggestions, setFacultySuggestions] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);

    const debouncedDepartmentQuery = useDebounce(departmentQuery, 300);
    const debouncedFacultyQuery = useDebounce(facultyQuery, 300);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<CourseFormData>({
        resolver: zodResolver(courseSchema),
    });

    // Fetch department suggestions
    useEffect(() => {
        if (!debouncedDepartmentQuery) return;

        const fetchSuggestions = async () => {
            try {
                const response = await fetch(`/api/department/suggestions?q=${debouncedDepartmentQuery}`);
                if (response.ok) {
                    const data = await response.json();
                    setDepartmentSuggestions(data.suggestions);
                }
            } catch (error) {
                console.error('Error fetching department suggestions:', error);
            }
        };

        fetchSuggestions();
    }, [debouncedDepartmentQuery]);

    // Fetch faculty suggestions
    useEffect(() => {
        if (!debouncedFacultyQuery) return;

        const fetchFacultySuggestions = async () => {
            try {
                const response = await fetch(`/api/faculty/suggestions?q=${debouncedFacultyQuery}`);
                if (response.ok) {
                    const data = await response.json();
                    setFacultySuggestions(data.suggestions);
                }
            } catch (error) {
                console.error('Error fetching faculty suggestions:', error);
            }
        };

        fetchFacultySuggestions();
    }, [debouncedFacultyQuery]);


    const onSubmit = async (data: CourseFormData) => {
        console.log('Submitting course data:', data);
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    department: {
                        name: departmentQuery,
                        faculty: {
                            name: facultyQuery,
                        },
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create course');
            }

            const course = await response.json();
            toast.success('Course created successfully');
            router.push(`/courses/${course.code}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create course');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create New Course</h1>
                        <p className="text-muted-foreground">Add a new course to the platform.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Course Code */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="code">
                                Course Code
                            </label>
                            <Input
                                id="code"
                                {...register('code')}
                                placeholder="e.g. CSC 101"
                                className="uppercase"
                            />
                            {errors.code && (
                                <p className="text-sm text-destructive">{errors.code.message}</p>
                            )}
                        </div>

                        {/* Course Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="title">
                                Course Title
                            </label>
                            <Input
                                id="title"
                                {...register('title')}
                                placeholder="Introduction to Computer Science"
                            />
                            {errors.title && (
                                <p className="text-sm text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        {/* Department */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="department">
                                Department
                            </label>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Input
                                        id="department"
                                        value={departmentQuery}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setDepartmentQuery(value);
                                            console.log('Department query:', value);
                                            setValue('department', { name: value });
                                            // Find selected department
                                            const dept = departmentSuggestions.find(d => d.name === value);
                                            if (dept) {
                                                setValue('department', {
                                                    id: dept.id,
                                                    name: dept.name,
                                                });
                                            }
                                        }}
                                        placeholder="Search for department..."
                                        list="department-suggestions"
                                    />
                                    <datalist id="department-suggestions">
                                        {departmentSuggestions.map((dept) => (
                                            <option key={dept.id} value={dept.name} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            {errors.department && (
                                <p className="text-sm text-destructive">{errors.department.message}</p>
                            )}
                        </div>

                        {/* Faculty Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Faculty</label>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Input
                                        id="faculty"
                                        value={facultyQuery}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFacultyQuery(value);
                                            setValue('faculty', { name: value });
                                            const faculty = facultySuggestions.find(f => f.name === value);
                                            setSelectedFacultyId(faculty?.id || null);
                                            if (faculty) {
                                                setValue('faculty', {
                                                    id: faculty.id,
                                                    name: faculty.name,
                                                });
                                            }
                                        }}
                                        placeholder="Search for faculty..."
                                        list="faculty-suggestions"
                                    />
                                    <datalist id="faculty-suggestions">
                                        {facultySuggestions.map((faculty) => (
                                            <option key={faculty.id} value={faculty.name} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            {errors.faculty && (
                                <p className="text-sm text-destructive">{errors.faculty.message}</p>
                            )}
                        </div>

                        {/* Course Synopsis */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="synopsis">
                                Course Synopsis
                            </label>
                            <Textarea
                                id="synopsis"
                                {...register('synopsis')}
                                placeholder="Provide a brief overview of the course..."
                                className="min-h-[100px]"
                            />
                            {errors.synopsis && (
                                <p className="text-sm text-destructive">{errors.synopsis.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin mr-2">
                                        progress_activity
                                    </span>
                                    Creating Course...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined mr-2">
                                        add_task
                                    </span>
                                    Create Course
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}