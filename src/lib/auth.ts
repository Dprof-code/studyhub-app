import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { db } from './dbconfig';
import { compare } from 'bcrypt';

// Extend NextAuth types
declare module 'next-auth' {
    interface User {
        id: string;
        uid?: string;
        avatarUrl?: string | null;
        username: string;
        firstname: string | null;
        lastname: string | null;
        role: string | null;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            username?: string;
            firstname: string | null;
            lastname: string | null;
            uid?: string;
            image?: string | null;
            role?: string;
            name?: string | null;
        };
    }

    interface JWT {
        id?: string;
        username: string;
        firstname: string | null;
        lastname: string | null;
        uid?: string;
        role?: string;
        image?: string | null;
    }
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(db),
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/sign-in',
    },
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required');
                }

                // Find user by email
                const existingUser = await db.user.findUnique({
                    where: { email: credentials.email },
                    include: { credentials: true },
                });

                if (!existingUser) {
                    throw new Error('No user found with the provided email');
                }

                // Check if user has credentials
                if (!existingUser.credentials || existingUser.credentials.length === 0) {
                    throw new Error('No credentials found for this user');
                }

                // Check if passwordHash exists
                const userCredential = existingUser.credentials[0];
                if (!userCredential.passwordHash) {
                    throw new Error('Invalid user credentials');
                }

                // Verify password
                const isPasswordValid = await compare(credentials.password, userCredential.passwordHash);

                if (!isPasswordValid) {
                    throw new Error('Invalid password');
                }

                return {
                    id: `${existingUser.id}`,
                    email: existingUser.email,
                    role: existingUser.role ?? undefined,
                    username: existingUser.username ?? undefined,
                    firstname: existingUser.firstname ?? undefined,
                    lastname: existingUser.lastname ?? undefined,
                    uid: existingUser.userId ?? undefined,
                    avatarUrl: existingUser.avatarUrl ?? undefined,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username ?? undefined;
                token.firstname = user.firstname ?? undefined;
                token.lastname = user.lastname ?? undefined;
                token.uid = user.uid ?? undefined;
                token.role = user.role ?? undefined;
                token.image = user.avatarUrl ?? undefined;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.username = (token.username as string) ?? undefined;
                session.user.firstname = (token.firstname as string) ?? null;
                session.user.lastname = (token.lastname as string) ?? null;
                session.user.uid = (token.uid as string) ?? undefined;
                session.user.role = (token.role as string) ?? undefined;
                session.user.image = (token.image as string) ?? null;
            }
            return session;
        },
    },
};