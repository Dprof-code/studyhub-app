import { NextResponse } from "next/server";
import { db } from "@/lib/dbconfig";
import { hash } from "bcrypt";
import * as z from "zod";


// Define schema for input validation
const userSchema = z.object({
    firstName: z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be less than 50 characters')
        .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),

    lastName: z
        .string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be less than 50 characters')
        .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),

    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be less than 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .toLowerCase(),

    role: z.enum(['STUDENT', 'LECTURER']),

    email: z
        .string()
        .email('Please enter a valid email address')
        .min(1, 'Email is required'),

    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
})

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { firstName, lastName, username, role, email, password } = userSchema.parse(body);

        // check if email already exists
        const existingUserByEmail = await db.user.findUnique({
            where: { email: email },
        });

        if (existingUserByEmail) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
        }

        // check if username already exists
        const existingUserByUsername = await db.user.findUnique({
            where: { username: username },
        });

        if (existingUserByUsername) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }

        // create admin user if no users exist
        const userCount = await db.user.count();
        if (userCount === 0) {
            const hashedPassword = await hash(password, 10);
            const newUser = await db.user.create({
                data: {
                    firstname: firstName,
                    lastname: lastName,
                    username,
                    role: 'ADMIN',
                    email,
                    credentials: {
                        create: {
                            provider: 'PASSWORD',
                            providerId: email,
                            passwordHash: hashedPassword,
                        }
                    }
                },
                include: {
                    credentials: true
                }
            });

            const { credentials: _, ...newUserWithoutPassword } = newUser;
            return NextResponse.json({ user: newUserWithoutPassword, message: 'Admin created successfully' }, { status: 201 });
        }

        // check role to determine if user is a student or lecturer
        const roleToUse = role === 'STUDENT' ? 'STUDENT' : 'LECTURER';
        const hashedPassword = await hash(password, 10);
        const newUser = await db.user.create({
            data: {
                firstname: firstName,
                lastname: lastName,
                username,
                role: roleToUse,
                email,
                credentials: {
                    create: {
                        provider: 'PASSWORD',
                        providerId: email,
                        passwordHash: hashedPassword,
                    }
                }
            },
            include: {
                credentials: true
            }
        });

        const { credentials: _, ...newUserWithoutPassword } = newUser;
        return NextResponse.json({ user: newUserWithoutPassword, message: 'User created successfully' }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
        }
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}