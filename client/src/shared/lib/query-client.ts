import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

// For using Tanstack Query Devtools:
declare global {
	interface Window {
		__TANSTACK_QUERY_CLIENT__: import("@tanstack/query-core").QueryClient;
	}
}

window.__TANSTACK_QUERY_CLIENT__ = queryClient;
