import { redirect } from '@sveltejs/kit';

//function to catch any other path except specified by the web server ( "/" by itself no longer accepted or permitted)
export async function load({locals}){
    const session = await locals.auth();

    if (session){
        throw redirect(307, '/home');
    } else {
        throw redirect(307, '/login');
    }
}