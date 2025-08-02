import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET() {
    try {
        const departments = await db.department.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return NextResponse.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}