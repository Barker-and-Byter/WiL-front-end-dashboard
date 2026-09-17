import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from "./auth";
import { initDB } from './utils/initDb';

/** @type {import('@sveltejs/kit').Handle} */
async function authorisation({ event, resolve }) {
    const pathname = event.url.pathname;

    if (
        pathname.startsWith('/auth') ||
        pathname.startsWith('/api/auth') ||
        pathname === '/verify' ||
        pathname === '/' ||
        pathname === '/login'
    ) {
        return await resolve(event);
    }

    if (pathname  === '/login') {
        const session = await event.locals.auth();

        const isSigningOut = event.url.searchParams.has('signout') || event.request.headers.get('referer')?.includes('signout');

        if (session && !isSigningOut) {
            throw redirect(307, '/home');
        }
        return await resolve(event);
    }
    const session = await event.locals.auth();

    if (!session) {
        throw redirect(307, '/login');
    }

    return await resolve(event);
}

export async function init() {
    console.log("Initializing database");
    try {
        await initDB();
    } catch (error) {
        console.log("Database initialisation failed", error);
        return;
    }
    console.log("Database successfully initialised");
}


export const handle = sequence(authHandle, authorisation);
