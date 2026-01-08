/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:pwa-register' {
	export interface RegisterSWOptions {
		immediate?: boolean;
		onNeedRefresh?: () => void;
		onOfflineReady?: () => void;
		onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
		onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
		onRegisterError?: (error: Error) => void;
	}

	export interface UseRegisterSWReturn {
		needRefresh: { value: boolean };
		offlineReady: { value: boolean };
		updateServiceWorker: (reload?: boolean) => Promise<void>;
	}

	export function useRegisterSW(options?: RegisterSWOptions): UseRegisterSWReturn;
}
