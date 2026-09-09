import { SvelteKitAuth } from "@auth/sveltekit";
import GitHub from "@auth/sveltekit/providers/github";
import Google from '@auth/sveltekit/providers/google';
import Credentials from '@auth/sveltekit/providers/credentials';
import { GetUserFromDb, verifyPassword } from "./utils/db";
import { AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET, AUTH_TRUST_HOST, ALLOWED_GITHUB_USERS } from "$env/static/private"; 
import { z } from 'zod';

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
});

export const { handle, signIn, signOut } = SvelteKitAuth({
        providers: [
            Credentials({
                credentials: {
                    email: {},
                    password: {},
                },
                authorize: async (credentials) => {
                    try {
                        const {email, password } = await loginSchema.parseAsync(credentials);

                        const user = GetUserFromDb(email);
                        if (!user){
                            throw new Error("User not found");
                        }

                        const isValid = await verifyPassword(password, user.password_hash);
                        if (!isValid) {
                            throw new Error("Invalid Password");
                        }

                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                        };
                    } catch (error) {
                            console.error("Auth error", error);
                            return null;
                        }
                }
            }),
            Google({
                clientId: AUTH_GOOGLE_ID,
                clientSecret: AUTH_GOOGLE_SECRET,
                authorization: {
                    params: {
                        prompt: "consent",
                        access_type: "offline",
                        response_type: "code",
                    },
                },
            }),
            GitHub({
                clientId: AUTH_GITHUB_ID,
                clientSecret: AUTH_GITHUB_SECRET,
            })
        ],
        secret: AUTH_SECRET,
        trustHost: AUTH_TRUST_HOST === "true" ? true : undefined,

        callbacks: {
            async signIn({ account, profile }) {
                if (account?.provider === "github") {
                    const githubUsername = profile?.login as string | undefined;

                    if (!githubUsername || !ALLOWED_GITHUB_USERS.includes(githubUsername.toLowerCase())){
                        return false;
                    }
                }
                return true;
            }
        }
});