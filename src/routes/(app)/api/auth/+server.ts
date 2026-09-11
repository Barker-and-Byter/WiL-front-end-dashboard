import { json, error } from '@sveltejs/kit';
import { env as privateEnv} from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from "./$types";


export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
  const { serverId } = await request.json();

  if (!serverId) {
    throw error(400, "Missing server Id in request body for auth");
  }

  const tokenKey = `PRIVATE_SERVER_${serverId.toUpperCase()}_API_TOKEN`;
  const sourceKey = `PUBLIC_EVENT_SOURCE_${serverId.toUpperCase()}`;

  const apiToken = (privateEnv as Record<string, string | undefined>)[tokenKey];
  const eventSource = (publicEnv as Record<string, string | undefined>)[sourceKey];

  if (!apiToken || !eventSource) {
    throw error(400, `Invalid or unconfigured server Id: ${serverId}` );
  }



    const res = await fetch(`${eventSource}/api/authenticate`, {
      method: "POST",
      credentials: "include",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ secret: apiToken }),
    });
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie){
        throw error(502, "no session cookies returned");
    }

    const match = setCookie.match(/auth_token=([^;]+)/);
    if (!match) {
        throw error(502, "Could not parse session cookie");
    }

    cookies.set(`monitor_session_${serverId.toLowerCase()}`, match[1], {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  });

    return json({ok: true});
}