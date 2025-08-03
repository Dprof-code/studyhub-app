'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const LEVELS = [
    { value: '100', label: '100 Level' },
    { value: '200', label: '200 Level' },
    { value: '300', label: '300 Level' },
    { value: '400', label: '400 Level' },
    { value: '500', label: '500 Level' },
];

type CourseFiltersProps = {
    departments: { id: number; code: string; name: string }[];
    onFilterChange: (filters: { search: string; department: string; level: string }) => void;
    currentFilters: { search: string; department: string; level: string };
};

export function CourseFilters({ departments, onFilterChange, currentFilters }: CourseFiltersProps) {
    return (
        <div className="space-y-4 p-4 bg-card rounded-lg">
            <h3 className="font-semibold">Filters</h3>
            <div className="grid gap-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Search courses..."
                        className="flex-1"
                        value={currentFilters.search}
                        onChange={(e) => onFilterChange({
                            ...currentFilters,
                            department: '',
                            search: e.target.value
                        })}
                    />
                    <Button variant="secondary">
                        <span className="material-symbols-outlined">search</span>
                    </Button>
                </div>
                {/* Level filter */}
                <Select
                    value={currentFilters.level || 'all'}
                    onValueChange={(value) => onFilterChange({
                        ...currentFilters,
                        level: value === 'all' ? '' : value
                    })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                                {level.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={currentFilters.department || 'all'}
                    onValueChange={(value) => onFilterChange({
                        ...currentFilters,
                        department: value
                    })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.code}>
                                {dept.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}