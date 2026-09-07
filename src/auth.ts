import { SvelteKitAuth } from "@auth/sveltekit";
import GitHub from "@auth/sveltekit/providers/github";
import Google from '@auth/sveltekit/providers/google';
import { AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET, AUTH_TRUST_HOST } from "$env/static/private";

export const { handle, signIn, signOut } = SvelteKitAuth({
        providers: [
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
        trustHost: AUTH_TRUST_HOST === "true" ? true : undefined
});