import { NextResponse } from "next/server";
import { db } from "@/lib/dbconfig";

export async function GET(
    req: Request,
    { params }: { params: { username: string } }
) {
    try {
        // const session = await getServerSession(authOptions);
        // if (!session?.user) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }
        const { username } = await params;

        const user = await db.user.findUnique({
            where: { username: username },
            select: {
                firstname: true,
                lastname: true,
                username: true,
                email: true,
                bio: true,
                avatarUrl: true,
                level: true,
                faculty: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        // if (!user) {
        //     return NextResponse.json({ error: 'User not found' }, { status: 404 });
        // }

        // Only allow users to view/edit their own profile
        // if (user.email !== session.user.email) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        // }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}