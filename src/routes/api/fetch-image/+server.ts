import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const { url } = await request.json();

		if (!url || typeof url !== 'string') {
			throw error(400, 'URL is required');
		}

		// Validate URL format
		let parsedUrl: URL;
		try {
			parsedUrl = new URL(url);
		} catch {
			throw error(400, 'Invalid URL format');
		}

		// Only allow http/https
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			throw error(400, 'Only HTTP and HTTPS URLs are allowed');
		}

		// Fetch the image
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; ImageFetcher/1.0)',
				'Accept': 'image/*'
			}
		});

		if (!response.ok) {
			throw error(response.status, `Failed to fetch image: ${response.statusText}`);
		}

		const contentType = response.headers.get('content-type') || '';

		// Validate content type is an image
		if (!contentType.startsWith('image/')) {
			throw error(415, 'URL does not point to a valid image');
		}

		// Check content length (max 10MB)
		const contentLength = response.headers.get('content-length');
		if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
			throw error(413, 'Image is too large. Maximum size is 10MB.');
		}

		const imageBuffer = await response.arrayBuffer();

		// Return the image with appropriate headers
		return new Response(imageBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch (err) {
		console.error('Fetch image error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Failed to fetch image');
	}
};
