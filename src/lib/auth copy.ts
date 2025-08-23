import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from './dbconfig';
import { compare } from 'bcrypt';

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
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/sign-in",
        error: "/auth/error",
    },
    providers: [
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [GoogleProvider({
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                authorization: {
                    params: {
                        prompt: "consent",
                        access_type: "offline",
                        response_type: "code"
                    }
                }
            })]
            : []
        ),
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

                const existingUser = await db.user.findUnique({
                    where: { email: credentials.email },
                    include: { credentials: true }
                });

                if (!existingUser) {
                    throw new Error("No user found with the provided email");
                }

                if (!existingUser.credentials || existingUser.credentials.length === 0) {
                    throw new Error("No credentials found for this user");
                }

                const userCredential = existingUser.credentials[0];
                if (!userCredential.passwordHash) {
                    throw new Error("Invalid user credentials");
                }

                const isPasswordValid = await compare(
                    credentials.password,
                    userCredential.passwordHash
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
                    avatarUrl: existingUser.avatarUrl || undefined,
                };
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google") {
                try {
                    // Check if user already exists
                    const existingUser = await db.user.findUnique({
                        where: { email: user.email! }
                    });

                    if (existingUser) {
                        // User exists, check if they have Google credentials
                        const googleCredential = await db.credential.findUnique({
                            where: {
                                provider_providerId: {
                                    provider: 'GOOGLE',
                                    providerId: account.providerAccountId
                                }
                            }
                        });

                        if (!googleCredential) {
                            // Link Google account to existing user
                            await db.credential.create({
                                data: {
                                    provider: 'GOOGLE',
                                    providerId: account.providerAccountId,
                                    userId: existingUser.id
                                }
                            });
                        }
                        return true;
                    } else {
                        // Check if this is first user (make admin)
                        const userCount = await db.user.count();
                        const role = userCount === 0 ? 'ADMIN' : 'STUDENT';

                        // Create new user with Google credentials
                        const newUser = await db.user.create({
                            data: {
                                email: user.email!,
                                firstname: (profile as any)?.given_name || user.name?.split(' ')[0] || '',
                                lastname: (profile as any)?.family_name || user.name?.split(' ').slice(1).join(' ') || '',
                                username: user.email!.split('@')[0], // Generate username from email
                                role: role,
                                avatarUrl: user.image,
                                credentials: {
                                    create: {
                                        provider: 'GOOGLE',
                                        providerId: account.providerAccountId
                                    }
                                }
                            }
                        });

                        // Update user object with new data
                        user.id = `${newUser.id}`;
                        user.role = newUser.role;
                        user.username = newUser.username;
                        user.firstname = newUser.firstname;
                        user.lastname = newUser.lastname;
                        user.uid = newUser.userId;

                        return true;
                    }
                } catch (error) {
                    console.error('Error during Google sign in:', error);
                    return false;
                }
            }
            return true;
        },
        async redirect({ url, baseUrl }) {
            // If it's a callback from OAuth, redirect to user profile
            if (url.startsWith(baseUrl + '/api/auth/callback')) {
                // We need to get the user's username from the database
                // This will be handled in the jwt callback where we have access to the user data
                return `${baseUrl}/dashboard`; // Temporarily go to dashboard, we'll redirect from there
            }

            // Handle sign-in redirects
            if (url.startsWith(baseUrl + '/api/auth/signin')) {
                return `${baseUrl}/dashboard`;
            }

            // For other redirects, use the provided URL or default to base URL
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
        async jwt({ token, user }) {
            if (user) {
                // Fetch user data from database to get complete info
                const dbUser = await db.user.findUnique({
                    where: { email: user.email! }
                });

                if (dbUser) {
                    return {
                        ...token,
                        username: dbUser.username,
                        id: `${dbUser.id}`,
                        uid: dbUser.userId,
                        image: dbUser.avatarUrl,
                        firstname: dbUser.firstname,
                        lastname: dbUser.lastname,
                        role: dbUser.role,
                    };
                }
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
    }
};