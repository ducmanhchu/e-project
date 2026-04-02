import type { RouteObject } from "react-router";
import { redirect } from "react-router";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import BackTranslate from "./pages/BackTranslate";
import SeeAndWrite from "./pages/SeeAndWrite";
import Paraphrase from "./pages/Paraphrase";
import Conversation from "./pages/Conversation";

export const adminRoutes: RouteObject[] = [
	{
		path: "/admin/login",
		Component: Login,
	},
	{
		path: "/admin",
		Component: AdminLayout,
		children: [
			{ index: true, loader: () => redirect("/admin/back-translate") },
			{ path: "back-translate", Component: BackTranslate },
			{ path: "see-and-write", Component: SeeAndWrite },
			{ path: "paraphrase", Component: Paraphrase },
			{ path: "conversation", Component: Conversation },
		],
	},
];
