// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				AUTH_GITHUB_ID: string;
				AUTH_GITHUB_SECRET: string;
				AUTH_SECRET: string;
				AUTH_TRUST_HOST: boolean;
			};
			context?: {
				waitUntil(promise: Promise<any>): void;
			};
			caches?: CacheStorage;
		}
	}
}

export {};
