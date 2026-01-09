import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sharp from 'sharp';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const imageFile = formData.get('image') as File | null;

		if (!imageFile) {
			return json({ error: 'No image provided' }, { status: 400 });
		}

		// Get enhancement parameters
		const brightness = parseFloat(formData.get('brightness') as string) || 100;
		const contrast = parseFloat(formData.get('contrast') as string) || 100;
		const sharpness = parseFloat(formData.get('sharpness') as string) || 0;
		const grayscale = formData.get('grayscale') === 'true';

		// Convert file to buffer
		const arrayBuffer = await imageFile.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Start sharp pipeline
		let pipeline = sharp(buffer);

		// Get metadata to check orientation
		const metadata = await pipeline.metadata();

		// Auto-rotate based on EXIF orientation
		pipeline = pipeline.rotate();

		// Resize if too large (max 2048px on longest side)
		const maxDimension = 2048;
		if (metadata.width && metadata.height) {
			const longest = Math.max(metadata.width, metadata.height);
			if (longest > maxDimension) {
				pipeline = pipeline.resize(maxDimension, maxDimension, {
					fit: 'inside',
					withoutEnlargement: true
				});
			}
		}

		// Apply brightness and contrast adjustments
		// Sharp uses a different scale: brightness is additive (-1 to 1), contrast is multiplicative
		const brightnessNormalized = (brightness - 100) / 100; // Convert 50-150 to -0.5 to 0.5
		const contrastNormalized = contrast / 100; // Convert 50-150 to 0.5 to 1.5

		pipeline = pipeline.modulate({
			brightness: 1 + brightnessNormalized
		});

		// Apply contrast using linear adjustment
		if (contrast !== 100) {
			pipeline = pipeline.linear(contrastNormalized, 128 * (1 - contrastNormalized));
		}

		// Apply sharpening if requested
		if (sharpness > 0) {
			// Sharp's sharpen uses sigma (blur radius)
			// sharpness 0-100 maps to sigma 0.5-2.0
			const sigma = 0.5 + (sharpness / 100) * 1.5;
			pipeline = pipeline.sharpen({
				sigma: sigma,
				m1: 1.0, // Flat areas
				m2: 2.0 // Jagged areas
			});
		}

		// Convert to grayscale if requested (can help with OCR)
		if (grayscale) {
			pipeline = pipeline.grayscale();
		}

		// Output as JPEG with good quality
		const outputBuffer = await pipeline.jpeg({ quality: 92 }).toBuffer();

		// Return the processed image
		return new Response(outputBuffer, {
			headers: {
				'Content-Type': 'image/jpeg',
				'Content-Length': outputBuffer.length.toString()
			}
		});
	} catch (error) {
		console.error('Image enhancement error:', error);
		return json(
			{ error: 'Failed to enhance image', details: String(error) },
			{ status: 500 }
		);
	}
};
