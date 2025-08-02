import NextAuth from "next-auth";

declare module "next-auth" {
    interface User {
        id: string;
        email: string;
        role: string;
        username: string;
        firstname: string;
        lastname: string;
    }
    interface Session {
        user: User & {
            username: string;
            firstname: string;
            lastname: string;
        }
        token: {
            username: string;
            firstname: string;
            lastname: string;
            id: string;
            email: string;
            role: string;
        }
    }
}