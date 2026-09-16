import { json } from '@sveltejs/kit';

export async function GET({locals}) {
    const session = await locals.auth();

    if (!session || !session.user) {
        return new Response('Unauthorised', { status: 401 });
    }

    const responseHeaders = new Headers();
    responseHeaders.set('X-Auth-User-Email', session.user.email || '');
    responseHeaders.set('X-Auth-User-Name', session.user.name || '');

    return new Response('OK', {
        status: 200,
        headers: responseHeaders
    })
}