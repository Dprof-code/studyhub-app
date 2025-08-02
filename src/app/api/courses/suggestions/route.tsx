import { NextResponse } from "next/server";
import { db } from "@/lib/dbconfig";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ suggestions: [] });
        }

        const courses = await db.course.findMany({
            where: {
                OR: [
                    {
                        code: {
                            contains: query.toUpperCase(),
                            mode: 'insensitive',
                        }
                    },
                    {
                        title: {
                            contains: query,
                            mode: 'insensitive',
                        }
                    }
                ]
            },
            include: {
                department: {
                    include: {
                        faculty: true
                    }
                }
            },
            take: 5,
        });

        return NextResponse.json({ suggestions: courses });
    } catch (error) {
        console.error('Error fetching course suggestions:', error);
        return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }
}
