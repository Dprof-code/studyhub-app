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
            console.log('🚀 SignIn callback triggered');
            console.log('Provider:', account?.provider);
            console.log('User email:', user.email);
            console.log('Account:', account);
            console.log('Profile:', profile);

            if (account?.provider === "google") {
                try {
                    console.log('🔍 Checking for existing user with email:', user.email);

                    // Check if user already exists
                    const existingUser = await db.user.findUnique({
                        where: { email: user.email! },
                        include: { credentials: true }
                    });

                    if (existingUser) {
                        console.log('✅ User exists:', existingUser.email);

                        // Check if they have Google credentials
                        const hasGoogleCredential = existingUser.credentials.some(
                            cred => cred.provider === 'GOOGLE' && cred.providerId === account.providerAccountId
                        );

                        if (!hasGoogleCredential) {
                            console.log('🔗 Linking Google account to existing user');
                            // Link Google account to existing user
                            await db.credential.create({
                                data: {
                                    provider: 'GOOGLE',
                                    providerId: account.providerAccountId,
                                    userId: existingUser.id
                                }
                            });
                        }

                        // Update the user object with database data
                        user.id = `${existingUser.id}`;
                        user.role = existingUser.role;
                        user.username = existingUser.username;
                        user.firstname = existingUser.firstname;
                        user.lastname = existingUser.lastname;
                        user.uid = existingUser.userId;

                        console.log('✅ SignIn successful for existing user');
                        return true;
                    } else {
                        console.log('👤 Creating new user for:', user.email);

                        // Check if this is first user (make admin)
                        const userCount = await db.user.count();
                        const role = userCount === 0 ? 'ADMIN' : 'STUDENT';

                        // Generate a unique username
                        const baseUsername = user.email!.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                        let username = baseUsername;
                        let counter = 1;

                        while (await db.user.findUnique({ where: { username } })) {
                            username = `${baseUsername}${counter}`;
                            counter++;
                        }

                        console.log('📝 Creating user with username:', username);

                        // Create new user with Google credentials
                        const newUser = await db.user.create({
                            data: {
                                email: user.email!,
                                firstname: (profile as any)?.given_name || user.name?.split(' ')[0] || '',
                                lastname: (profile as any)?.family_name || user.name?.split(' ').slice(1).join(' ') || '',
                                username: username,
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

                        console.log('✅ New user created:', newUser.email, 'with role:', newUser.role);

                        // Update user object with new data
                        user.id = `${newUser.id}`;
                        user.role = newUser.role;
                        user.username = newUser.username;
                        user.firstname = newUser.firstname;
                        user.lastname = newUser.lastname;
                        user.uid = newUser.userId;

                        console.log('✅ SignIn successful for new user');
                        return true;
                    }
                } catch (error) {
                    console.error('❌ Error during Google sign in:', error);
                    return false;
                }
            }
            console.log('✅ SignIn successful for credentials');
            return true;
        },
        async redirect({ url, baseUrl }) {
            console.log('🔀 Redirect callback triggered');
            console.log('URL:', url);
            console.log('Base URL:', baseUrl);

            // If it's a callback from OAuth, redirect to dashboard
            if (url.startsWith(baseUrl + '/api/auth/callback')) {
                console.log('🔄 OAuth callback redirect to dashboard');
                return `${baseUrl}/dashboard`;
            }

            // Handle sign-in redirects
            if (url.startsWith(baseUrl + '/api/auth/signin')) {
                console.log('🔄 Sign-in redirect to dashboard');
                return `${baseUrl}/dashboard`;
            }

            // For other redirects, use the provided URL or default to base URL
            if (url.startsWith('/')) {
                console.log('🔄 Relative URL redirect:', `${baseUrl}${url}`);
                return `${baseUrl}${url}`;
            }
            if (new URL(url).origin === baseUrl) {
                console.log('🔄 Same origin redirect:', url);
                return url;
            }
            console.log('🔄 Default redirect to base URL');
            return baseUrl;
        },
        async jwt({ token, user }) {
            console.log('🎫 JWT callback triggered');

            if (user) {
                console.log('👤 User data in JWT:', user);

                try {
                    // Fetch user data from database to get complete info
                    const dbUser = await db.user.findUnique({
                        where: { email: user.email! }
                    });

                    if (dbUser) {
                        console.log('📄 Database user found for JWT:', dbUser.username);
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
                } catch (error) {
                    console.error('❌ Error in JWT callback:', error);
                }
            }
            return token;
        },
        async session({ session, token }) {
            console.log('🗓️ Session callback triggered');
            console.log('Token data:', { id: token.id, username: token.username, role: token.role });

            if (session.user) {
                session.user.id = token.id as string;
                session.user.username = (token.username as string) ?? undefined;
                session.user.firstname = (token.firstname as string) ?? null;
                session.user.lastname = (token.lastname as string) ?? null;
                session.user.uid = (token.uid as string) ?? undefined;
                session.user.role = (token.role as string) ?? undefined;
                session.user.image = (token.image as string) ?? null;

                console.log('📋 Final session user:', {
                    id: session.user.id,
                    username: session.user.username,
                    role: session.user.role
                });
            }
            return session;
        },
    },
    debug: true, // Enable debug mode
};