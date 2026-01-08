import type { Handle } from '@sveltejs/kit';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
	// Create PocketBase instance for this request
	event.locals.pb = new PocketBase(env.PUBLIC_POCKETBASE_URL);

	// Load auth state from cookie
	const cookie = event.request.headers.get('cookie') || '';
	event.locals.pb.authStore.loadFromCookie(cookie);

	// Validate and refresh token if exists
	try {
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
			event.locals.user = event.locals.pb.authStore.record;
		} else {
			event.locals.user = null;
		}
	} catch {
		// Token invalid or expired
		event.locals.pb.authStore.clear();
		event.locals.user = null;
	}

	const response = await resolve(event);

	// Update auth cookie on response
	// Note: httpOnly must be false for client-side PocketBase to read auth for realtime subscriptions
	response.headers.append(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({
			httpOnly: false,
			secure: !dev,
			sameSite: 'lax',
			path: '/'
		})
	);

	return response;
};
