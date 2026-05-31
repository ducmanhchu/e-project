import { QueryClient } from "@tanstack/react-query";

const STALE_TIME = 1000 * 60 * 3;

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: STALE_TIME,
		},
	},
});

// For using Tanstack Query Devtools:
declare global {
	interface Window {
		__TANSTACK_QUERY_CLIENT__: QueryClient;
	}
}

window.__TANSTACK_QUERY_CLIENT__ = queryClient;
