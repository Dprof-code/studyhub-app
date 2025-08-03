import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const sort = searchParams.get('sort') || 'recent';

        // Build where clause
        const where: any = {};
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { course: { code: { contains: search, mode: 'insensitive' } } },
                { course: { title: { contains: search, mode: 'insensitive' } } },
            ];
        }

        // Build orderBy clause
        let orderBy: any[] = [{ createdAt: 'desc' }];
        if (sort === 'active') {
            orderBy = [{ posts: { _count: 'desc' } }];
        } else if (sort === 'popular') {
            orderBy = [{ posts: { _count: 'desc' } }];
        }

        const threads = await db.thread.findMany({
            where,
            include: {
                course: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        department: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        posts: true,
                    },
                },
                posts: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        createdAt: true,
                        author: {
                            select: {
                                firstname: true,
                                lastname: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { isStickied: 'desc' },
                ...orderBy,
            ],
            take: 20,
        });

        // Transform the posts array into a single lastPost field
        const transformedThreads = threads.map(thread => ({
            ...thread,
            lastPost: thread.posts[0] || null,
            posts: undefined,
        }));

        return NextResponse.json({ threads: transformedThreads });
    } catch (error) {
        console.error('Error fetching discussions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}