import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect to home if already logged in
	if (locals.user) {
		redirect(303, '/');
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

		redirect(303, '/');
	},

	register: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;
		const passwordConfirm = data.get('passwordConfirm') as string;

		if (!email || !password || !passwordConfirm) {
			return fail(400, {
				error: 'All fields are required',
				email
			});
		}

		if (password !== passwordConfirm) {
			return fail(400, {
				error: 'Passwords do not match',
				email
			});
		}

		if (password.length < 8) {
			return fail(400, {
				error: 'Password must be at least 8 characters',
				email
			});
		}

		try {
			await locals.pb.collection('users').create({
				email,
				password,
				passwordConfirm
			});

			// Auto-login after registration
			await locals.pb.collection('users').authWithPassword(email, password);
		} catch (err: unknown) {
			console.error('Registration error:', err);
			const message = err instanceof Error ? err.message : 'Registration failed';
			return fail(400, {
				error: message,
				email
			});
		}

		redirect(303, '/');
	},

	logout: async ({ locals, cookies }) => {
		locals.pb.authStore.clear();
		cookies.delete('pb_auth', { path: '/' });
		redirect(303, '/login');
	}
};
