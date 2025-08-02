import { NextResponse } from "next/server";
import { db } from "@/lib/dbconfig";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ suggestions: [] });
        }

        const faculties = await db.faculty.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive', // Case-insensitive search
                },
            },
            take: 5, // Limit results
        });

        return NextResponse.json({ suggestions: faculties });
    } catch (error) {
        console.error('Error fetching faculty suggestions:', error);
        return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }
}