import { PRIVATE_SERVER_ONE_API_TOKEN } from "$env/static/private";
import { PUBLIC_EVENT_SOURCE_ONE } from '$env/static/public';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from "../auth/$types";

export const GET: RequestHandler = async ({ cookies, fetch }) => {
    const sessionToken = cookies.get("monitor_session_1");
    if (!sessionToken) {
        throw error(401, "Not authenticated");
    }

    const rustRes = await fetch(`${PUBLIC_EVENT_SOURCE_ONE}/data-stream`, {
        headers: { Cookie: `auth_token=${sessionToken}`},
    });

    if (!rustRes.ok || !rustRes.body) {
        throw error (rustRes.status, "failed to connect to rust monitor");
    }

    return new Response(rustRes.body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        }
    })
}