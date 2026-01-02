/**
 * Timing utilities for measuring AI service performance
 */

export interface TimingResult<T> {
	result: T;
	startTime: Date;
	endTime: Date;
	durationMs: number;
}

/**
 * Wraps an async function and measures its execution time
 */
export async function withTiming<T>(fn: () => Promise<T>): Promise<TimingResult<T>> {
	const startTime = new Date();

	try {
		const result = await fn();
		const endTime = new Date();

		return {
			result,
			startTime,
			endTime,
			durationMs: endTime.getTime() - startTime.getTime()
		};
	} catch (error) {
		const endTime = new Date();
		throw {
			error,
			startTime,
			endTime,
			durationMs: endTime.getTime() - startTime.getTime()
		};
	}
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	} else if (ms < 60000) {
		return `${(ms / 1000).toFixed(2)}s`;
	} else {
		const minutes = Math.floor(ms / 60000);
		const seconds = ((ms % 60000) / 1000).toFixed(1);
		return `${minutes}m ${seconds}s`;
	}
}
