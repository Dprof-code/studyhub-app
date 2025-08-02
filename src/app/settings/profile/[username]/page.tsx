'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { useSession } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from "sonner"
import { SettingsSidebar } from '../../../../components/SettingsSidebar';
import { useDebounce } from '@/hooks/useDebounce';

type Suggestion = {
    id: number;
    name: string;
};

type UserData = {
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    bio: string | null;
    avatarUrl: string | null;
    faculty: { id: number; name: string; } | null;
    department: { id: number; name: string; } | null;
    level: number | null;
};

const profileSchema = z.object({
    firstname: z.string().min(2, 'First name must be at least 2 characters'),
    lastname: z.string().min(2, 'Last name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Please enter a valid email address'),
    bio: z.string().max(160, 'Bio must be less than 160 characters').optional(),
    faculty: z.object({
        name: z.string().min(2, 'Faculty name is required'),
        id: z.number().optional()
    }),
    department: z.object({
        name: z.string().min(2, 'Department name is required'),
        id: z.number().optional()
    }),
    level: z.number().min(1).max(6).optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileSettings() {
    const router = useRouter();
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            router.push('/sign-in');
        },
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [facultySuggestions, setFacultySuggestions] = useState<Suggestion[]>([]);
    const [departmentSuggestions, setDepartmentSuggestions] = useState<Suggestion[]>([]);
    const [facultyQuery, setFacultyQuery] = useState('');
    const [departmentQuery, setDepartmentQuery] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('/avatar.jpg');
    const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);

    const debouncedFacultyQuery = useDebounce(facultyQuery, 300);
    const debouncedDepartmentQuery = useDebounce(departmentQuery, 300);

    const params = useParams();
    const username = params.username as string;

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        setError,
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            faculty: { name: '' },
            department: { name: '' },
        }
    });

    // Add check for user authorization
    useEffect(() => {
        if (status === 'authenticated' && session.user.username !== username) {
            toast.error('You are not authorized to edit this profile');
            router.push(`/${session.user.username}`);
        }
    }, [session, status, username, router]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch(`/api/user/profile/${username}`);
                if (!response.ok) throw new Error('Failed to fetch user data');

                const userData: UserData = await response.json();

                // Update form values
                setValue('firstname', userData.firstname);
                setValue('lastname', userData.lastname);
                setValue('username', userData.username);
                setValue('email', userData.email);
                setValue('bio', userData.bio || '');
                setValue('level', userData.level);

                // Update faculty and department
                if (userData.faculty) {
                    setValue('faculty', userData.faculty);
                    setSelectedFacultyId(userData.faculty.id);
                    setFacultyQuery(userData.faculty.name);
                }

                if (userData.department) {
                    setValue('department', userData.department);
                    setDepartmentQuery(userData.department.name);
                }

                // Update avatar
                if (userData.avatarUrl) {
                    setAvatarUrl(userData.avatarUrl);
                }

            } catch (error) {
                console.error('Error fetching user data:', error);
                toast.error('Failed to load user data');
            }
        };

        fetchUserData();
    }, [username, setValue]);

    // Fetch faculty suggestions
    useEffect(() => {
        if (!debouncedFacultyQuery) return;

        const fetchSuggestions = async () => {
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

        fetchSuggestions();
    }, [debouncedFacultyQuery]);

    // Fetch department suggestions
    useEffect(() => {
        if (!debouncedDepartmentQuery) return;

        const fetchSuggestions = async () => {
            try {
                const response = await fetch(
                    `/api/department/suggestions?q=${debouncedDepartmentQuery}&facultyId=${selectedFacultyId}`
                );
                if (response.ok) {
                    const data = await response.json();
                    setDepartmentSuggestions(data.suggestions);
                }
            } catch (error) {
                console.error('Error fetching department suggestions:', error);
            }
        };

        fetchSuggestions();
    }, [debouncedDepartmentQuery, selectedFacultyId]);

    // Add these to watch the values
    const facultyValue = watch('faculty');
    const departmentValue = watch('department');

    // Show loading state while checking authentication
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    const handleAvatarUpload = (url: string) => {
        setAvatarUrl(url);
        toast.success('Avatar updated successfully');
    };



    const onSubmit = async (data: ProfileFormData) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/user/profile/update', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    faculty: {
                        name: facultyQuery || data.faculty.name,
                    },
                    department: {
                        name: departmentQuery || data.department.name
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error === 'Validation failed') {
                    errorData.details.forEach((error: { path: string[], message: string }) => {
                        // Handle nested paths properly
                        if (error.path[0] === 'faculty' && error.path[1] === 'name') {
                            setError('faculty', {
                                type: 'manual',
                                message: error.message,
                            });
                        } else if (error.path[0] === 'department' && error.path[1] === 'name') {
                            setError('department', {
                                type: 'manual',
                                message: error.message,
                            });
                        } else {
                            // Handle other fields
                            setError(error.path[0] as keyof ProfileFormData, {
                                type: 'manual',
                                message: error.message,
                            });
                        }
                    });
                    throw new Error('Validation failed');
                }
                throw new Error(errorData.error || 'Failed to update profile');
            }

            const result = await response.json();
            toast.success('Profile updated successfully');
            console.log(result);
            // Optionally refresh the page or update the UI
            router.refresh();
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update profile');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="w-full lg:w-1/4">
                        <SettingsSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold">Profile Settings</h1>
                                <p className="text-muted-foreground">
                                    Manage your profile and academic information
                                </p>
                            </div>

                            <div className="bg-card border border-border rounded-lg p-6">
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    {/* Avatar Section */}
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            size="xxl"
                                            src={avatarUrl}
                                            alt="Profile"
                                            className="ring-4 ring-background"
                                        />
                                        <div>
                                            <ImageUpload
                                                onUpload={handleAvatarUpload}
                                                onError={(error) => {
                                                    toast.error('Image upload failed');
                                                    console.error('Image upload error:', error);
                                                }}
                                            />
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Recommended: Square JPG, PNG. Max 1MB.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                First Name
                                            </label>
                                            <Input
                                                {...register('firstname')}
                                                error={errors.firstname?.message}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                Last Name
                                            </label>
                                            <Input
                                                {...register('lastname')}
                                                error={errors.lastname?.message}
                                            />
                                        </div>
                                    </div>

                                    {/* Username */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Username
                                        </label>
                                        <Input
                                            {...register('username')}
                                            error={errors.username?.message}
                                            prefix="@"
                                            readOnly
                                            className="bg-muted cursor-not-allowed"
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Username cannot be changed
                                        </p>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Email Address
                                        </label>
                                        <Input
                                            {...register('email')}
                                            error={errors.email?.message}
                                            type="email"
                                            readOnly
                                            className="bg-muted cursor-not-allowed"
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Email cannot be changed
                                        </p>
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Bio
                                        </label>
                                        <Textarea
                                            {...register('bio')}
                                            error={errors.bio?.message}
                                            placeholder="Write a short bio about yourself..."
                                            rows={4}
                                        />
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Brief description for your profile.
                                        </p>
                                    </div>

                                    {/* Faculty & Department Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Faculty Input */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Faculty</label>
                                            <input
                                                type="text"
                                                value={facultyQuery || facultyValue?.name || ''}
                                                className={`w-full rounded-lg border border-border bg-background px-3 py-2 
            ${errors.faculty ? 'border-destructive' : ''}`}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setFacultyQuery(value);
                                                    setValue('faculty', { name: value });
                                                    const faculty = facultySuggestions.find(f => f.name === value);
                                                    setSelectedFacultyId(faculty?.id || null);
                                                }}
                                                list="faculty-suggestions"
                                            />
                                            {errors.faculty && (
                                                <p className="text-sm text-destructive mt-1">
                                                    {errors.faculty.message}
                                                </p>
                                            )}
                                            <datalist id="faculty-suggestions">
                                                {facultySuggestions.map((faculty) => (
                                                    <option key={faculty.id} value={faculty.name} />
                                                ))}
                                            </datalist>
                                        </div>

                                        {/* Department Input */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Department</label>
                                            <input
                                                type="text"
                                                value={departmentQuery || departmentValue?.name || ''}
                                                className={`w-full rounded-lg border border-border bg-background px-3 py-2 
            ${errors.department ? 'border-destructive' : ''}`}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setDepartmentQuery(value);
                                                    setValue('department', { name: value });
                                                }}
                                                list="department-suggestions"
                                            />
                                            {errors.department && (
                                                <p className="text-sm text-destructive mt-1">
                                                    {errors.department.message}
                                                </p>
                                            )}
                                            <datalist id="department-suggestions">
                                                {departmentSuggestions.map((dept) => (
                                                    <option key={dept.id} value={dept.name} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>

                                    {/* Level (for students) */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Year Level
                                        </label>
                                        <Input
                                            {...register('level', { valueAsNumber: true })}
                                            error={errors.level?.message}
                                            type="number"
                                            min={1}
                                            max={6}
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full md:w-auto"
                                        >
                                            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}