import { PRIVATE_SERVER_ONE_API_TOKEN } from "$env/static/private";
import { PUBLIC_EVENT_SOURCE_ONE } from '$env/static/public';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from "../$types";


export const POST: RequestHandler = async ({ fetch, cookies }) => {
    const res = await fetch(`${PUBLIC_EVENT_SOURCE_ONE}/api/authenticate`, {
      method: "POST",
      credentials: "include",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ secret: PRIVATE_SERVER_ONE_API_TOKEN }),
    });
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie){
        throw error(502, "no session cookies returned");
    }

    const match = setCookie.match(/auth_token=([^;]+)/);
    if (!match) {
        throw error(502, "Could not parse session cookie");
    }

    cookies.set("monitor_session_1", match[1], {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  });

    return json({ok: true});
}