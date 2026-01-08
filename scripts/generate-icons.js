#!/usr/bin/env node

/**
 * Generate PWA icons from the source SVG
 * Run: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = join(__dirname, '../static/icons/icon.svg');
const outputDir = join(__dirname, '../static/icons');

// Ensure output directory exists
if (!existsSync(outputDir)) {
	mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
	console.log('Generating PWA icons...');

	for (const size of sizes) {
		const outputFile = join(outputDir, `icon-${size}x${size}.png`);
		try {
			await sharp(inputSvg)
				.resize(size, size)
				.png()
				.toFile(outputFile);
			console.log(`  Created: icon-${size}x${size}.png`);
		} catch (error) {
			console.error(`  Error creating icon-${size}x${size}.png:`, error.message);
		}
	}

	// Also create apple-touch-icon
	const appleTouchIcon = join(outputDir, 'apple-touch-icon.png');
	try {
		await sharp(inputSvg)
			.resize(180, 180)
			.png()
			.toFile(appleTouchIcon);
		console.log('  Created: apple-touch-icon.png');
	} catch (error) {
		console.error('  Error creating apple-touch-icon.png:', error.message);
	}

	// Create favicon
	const favicon = join(outputDir, '../favicon.png');
	try {
		await sharp(inputSvg)
			.resize(32, 32)
			.png()
			.toFile(favicon);
		console.log('  Created: favicon.png');
	} catch (error) {
		console.error('  Error creating favicon.png:', error.message);
	}

	console.log('Done!');
}

generateIcons().catch(console.error);
