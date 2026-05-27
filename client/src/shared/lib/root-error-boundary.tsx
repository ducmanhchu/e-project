import { isRouteErrorResponse, useRouteError } from "react-router";

import {
	ErrorPage,
	NOT_FOUND_PAGE,
	UNKNOWN_ERROR_PAGE,
} from "@/shared/components/error-page";

export function RootErrorBoundary() {
	const error = useRouteError();

	if (isRouteErrorResponse(error) && error.status === 404) {
		return <ErrorPage {...NOT_FOUND_PAGE} />;
	}

	return <ErrorPage {...UNKNOWN_ERROR_PAGE} />;
}
