import { createBrowserRouter } from "react-router";
import { userRoutes } from "@/domains/user/routes";
import { adminRoutes } from "@/domains/admin/routes";

export const router = createBrowserRouter([
	...userRoutes,
	...adminRoutes,
]);
