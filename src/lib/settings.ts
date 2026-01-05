// Global application settings store
// Settings are stored in memory on the server and persist across requests
// Prompts are now managed via Pocketbase - see /api/prompts

import type { AIProvider, AppSettings } from './pocketbase/types';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
	default_providers: ['gemini', 'groq', 'claude', 'openai', 'cloudvision']
};

// In-memory settings store (persists across requests in the same process)
let currentSettings: AppSettings = { ...DEFAULT_SETTINGS };

/**
 * Get the current application settings
 */
export function getSettings(): AppSettings {
	return { ...currentSettings };
}

/**
 * Update application settings (partial update)
 */
export function updateSettings(updates: Partial<AppSettings>): AppSettings {
	currentSettings = {
		...currentSettings,
		...updates
	};
	return { ...currentSettings };
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): AppSettings {
	currentSettings = { ...DEFAULT_SETTINGS };
	return { ...currentSettings };
}

/**
 * Get default settings (for comparison/reset)
 */
export function getDefaultSettings(): AppSettings {
	return { ...DEFAULT_SETTINGS };
}

/**
 * Get default providers to use when none specified
 */
export function getDefaultProviders(): AIProvider[] {
	return [...currentSettings.default_providers];
}
