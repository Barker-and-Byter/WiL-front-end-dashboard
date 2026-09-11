import {env as privateEnv} from '$env/dynamic/private';
import {env as publicEnv} from '$env/dynamic/public';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from "../auth/$types";

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
    const serverId = url.searchParams.get("serverId");
    if (!serverId) {
        throw error(400, "Missing server ID query parameter");
    }

    const sourceKey = `PUBLIC_EVENT_SOURCE_${serverId.toUpperCase()}`;

    const eventSource = (publicEnv as Record<string, string>)[sourceKey];

    if (!eventSource){
        throw error(404, `Configuration for server ${serverId} not found`)
    }


    const sessionToken = cookies.get(`monitor_session_${serverId}`);
    if (!sessionToken) {
        throw error(400, "Not authenticated");
    }


    const rustRes = await fetch(`${eventSource}/data-stream`, {
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