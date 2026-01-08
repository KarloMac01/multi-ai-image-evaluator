import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect to dashboard if already logged in
	if (locals.user) {
		redirect(303, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required',
				email
			});
		}

		try {
			await locals.pb.collection('users').authWithPassword(email, password);
		} catch (err: unknown) {
			console.error('Login error:', err);
			return fail(401, {
				error: 'Invalid email or password',
				email
			});
		}

		redirect(303, '/dashboard');
	},

	// Registration temporarily disabled - users are pre-determined
	register: async () => {
		return fail(403, {
			error: 'Registration is currently disabled. Please contact an administrator.'
		});
	},

	logout: async ({ locals, cookies }) => {
		locals.pb.authStore.clear();
		cookies.delete('pb_auth', { path: '/' });
		redirect(303, '/login');
	}
};
