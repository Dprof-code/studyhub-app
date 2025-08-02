import { NextResponse } from "next/server";
import { db } from "@/lib/dbconfig";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const facultyId = searchParams.get('facultyId');

        if (!query) {
            return NextResponse.json({ suggestions: [] });
        }

        const departments = await db.department.findMany({
            where: {
                AND: [
                    {
                        name: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    facultyId ? { facultyId: parseInt(facultyId) } : {},
                ],
            },
            take: 5,
        });

        return NextResponse.json({ suggestions: departments });
    } catch (error) {
        console.error('Error fetching department suggestions:', error);
        return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }
}