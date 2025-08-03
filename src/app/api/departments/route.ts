import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET() {
    try {
        const departments = await db.department.findMany({
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                code: true,
                name: true
            }
        });

        return NextResponse.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch departments' },
            { status: 500 }
        );
    }
}