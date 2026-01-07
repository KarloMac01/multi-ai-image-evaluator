import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// Output directory for the build
			out: 'build',
			// Precompress assets with gzip and brotli
			precompress: true,
			// Environment variable prefix for runtime config
			envPrefix: ''
		})
	}
};

export default config;
