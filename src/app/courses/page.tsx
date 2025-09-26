'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseFilters } from '@/components/courses/CourseFilters';
import { Button } from '@/components/ui/button';

type Department = {
  id: number;
  code: string;
  name: string;
};

type Course = {
  id: number;
  code: string;
  title: string;
  synopsis: string;
  department: {
    name: string;
    code: string;
  };
  level: number;
};

export default function Courses() {
  const [filters, setFilters] = useState({ search: '', department: '', level: '' });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json();
    },
  });

  const { data: courses = [], isLoading, refetch } = useQuery<Course[]>({
    queryKey: ['courses', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.department && filters.department !== 'all') {
        params.append('department', filters.department);
      }
      if (filters.level && filters.level !== 'all') {
        params.append('level', filters.level);
      }

      const response = await fetch(`/api/courses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    },
  });

  // Handle filter changes from CourseFilters
  const handleFilterChange = (newFilters: { search: string; department: string; level: string }) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset department to empty string if 'all' is selected
      department: newFilters.department === 'all' ? '' : newFilters.department,
      // Reset level to empty string if 'all' is selected
      level: newFilters.level === 'all' ? '' : newFilters.level,
    }));
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Courses</h1>
            <p className="text-muted-foreground">
              Browse and access your academic courses
            </p>
          </div>
          <Button>
            <span className="material-symbols-outlined mr-2">filter_list</span>
            Sort
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="md:col-span-1">
            <CourseFilters
              departments={departments}
              onFilterChange={handleFilterChange}
              currentFilters={filters}
            />
          </div>

          {/* Course Grid */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course: any) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    code={course.code}
                    title={course.title}
                    synopsis={course.synopsis}
                    department={course.department.name}
                    level={course.level}
                    isEnrolled={course.isEnrolled}
                    enrollmentStatus={course.enrollmentStatus}
                    studentCount={course.studentCount}
                    resourceCount={course.resourceCount}
                    onEnrollmentChange={() => {
                      // Refetch courses when enrollment changes
                      refetch();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}