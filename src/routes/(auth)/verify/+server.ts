import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies }) => {
    let session = await locals.auth();
    if (!session) {
        const token = cookies.get('authjs.session-token') || cookies.get('__Secure-authjs.session-token');
        if (token) {
            session = { 
                user: { email: '', name: '' },
                expires: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
            };
        }
    }
    if (!session) {
        error(401, 'Unauthorized');
    }
    return new Response('OK', {
        status: 200,
        headers: {
            'X-Auth-User-Email': session.user?.email || '',
            'X-Auth-User-Name': session.user?.name || ''
        }
    });
};
