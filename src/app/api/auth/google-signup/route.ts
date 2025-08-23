import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function POST(req: Request) {
    try {
        const { email, role } = await req.json();

        if (!email || !role) {
            return NextResponse.json(
                { error: 'Email and role are required' },
                { status: 400 }
            );
        }

        // Update user role
        const updatedUser = await db.user.update({
            where: { email },
            data: { role: role.toUpperCase() }
        });

        return NextResponse.json({
            success: true,
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        return NextResponse.json(
            { error: 'Failed to update user role' },
            { status: 500 }
        );
    }
}