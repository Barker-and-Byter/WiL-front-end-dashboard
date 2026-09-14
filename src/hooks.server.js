import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from "./auth";
import { initDB } from './utils/initDb';

 
/** @type {import('@sveltejs/kit').Handle} */
async function authorisation({ event, resolve }){
    //allow for my auth route to bypass redirection
    if (event.url.pathname.startsWith('/auth')) {
        return await resolve(event);
    }

    const session = await event.locals.auth();
    const accessingLoginPage = event.url.pathname === '/login';


    if (!session && !accessingLoginPage) {
        throw redirect(307, '/login');
    }

    if (session && accessingLoginPage) {
        throw redirect(307, '/home');
    }

    return await resolve(event);
}

export async function init() {
    console.log("Initializing database");
    try {
        await initDB()
    } catch (error) {
        console.log("database initialisation failed");
        return
    }
    console.log("Database succesfully initialised");
    

}
export const handle = sequence(authHandle, authorisation);