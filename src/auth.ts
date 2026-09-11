import { SvelteKitAuth } from "@auth/sveltekit";
import GitHub from "@auth/sveltekit/providers/github";
import Google from '@auth/sveltekit/providers/google';
import Credentials from '@auth/sveltekit/providers/credentials';
import { GetUserFromDb, verifyPassword } from "./utils/db";
import { env } from "$env/dynamic/private"; 
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
                clientId: env.AUTH_GOOGLE_ID,
                clientSecret: env.AUTH_GOOGLE_SECRET,
                authorization: {
                    params: {
                        prompt: "consent",
                        access_type: "offline",
                        response_type: "code",
                    },
                },
            }),
            GitHub({
                clientId: env.AUTH_GITHUB_ID,
                clientSecret: env.AUTH_GITHUB_SECRET,
            })
        ],
        secret: env.AUTH_SECRET,
        trustHost: env.AUTH_TRUST_HOST === "true",

        callbacks: {
            async signIn({ account, profile }) {
                if (account?.provider === "github") {
                    const githubUsername = profile?.login as string | undefined;

                    if (!githubUsername || !env.ALLOWED_GITHUB_USERS.includes(githubUsername.toLowerCase())){
                        return false;
                    }
                }
                return true;
            }
        }
});