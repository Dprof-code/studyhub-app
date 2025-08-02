'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function Search() {
    const router = useRouter();
    const [query, setQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className="w-full max-w-sm hidden md:block">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <span className="material-symbols-outlined">search</span>
                </span>
                <input
                    type="search"
                    placeholder="Search..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>
        </form>
    );
}