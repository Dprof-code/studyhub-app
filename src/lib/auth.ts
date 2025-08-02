import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { User } from 'next-auth';

declare module 'next-auth' {
    interface User {
        uid?: string;
        avatarUrl?: string;
    }
}
import { db } from './dbconfig';
import { compare } from 'bcrypt';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(db),
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/sign-in",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                // Find user by email
                const existingUser = await db.user.findUnique({
                    where: { email: credentials.email },
                    include: { credentials: true }
                });

                if (!existingUser) {
                    throw new Error("No user found with the provided email");
                }

                // Verify password
                const isPasswordValid = await compare(
                    credentials.password,
                    existingUser.credentials[0].passwordHash
                );

                if (!isPasswordValid) {
                    throw new Error("Invalid password");
                }

                return {
                    id: `${existingUser.id}`,
                    email: existingUser.email,
                    role: existingUser.role,
                    username: existingUser.username,
                    firstname: existingUser.firstname,
                    lastname: existingUser.lastname,
                    uid: existingUser.userId,
                    avatarUrl: existingUser.avatarUrl || null,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                return {
                    ...token,
                    username: user.username,
                    id: user.id,
                    uid: user.uid,
                    image: user.avatarUrl,
                    firstname: user.firstname,
                    lastname: user.lastname,
                }
            }
            return token;
        },
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    username: token.username,
                    id: token.id,
                    uid: token.uid,
                    image: token.image,
                    firstname: token.firstname,
                    lastname: token.lastname,
                }
            }
        },
    }
};