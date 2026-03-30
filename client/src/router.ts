import { createBrowserRouter } from "react-router";
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: UserLayout,
	},
	{
		path: "/admin",
		Component: AdminLayout,
	},
]);
