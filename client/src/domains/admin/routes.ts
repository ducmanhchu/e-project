import type { RouteObject } from "react-router";
import { redirect } from "react-router";

import { AdminLayout } from "./layouts/admin-layout";
import { Login } from "./pages/login";
import { BackTranslate } from "./pages/back-translate";
import { SeeAndWrite } from "./pages/see-and-write";
import { Paraphrase } from "./pages/paraphrase";
import { Conversation } from "./pages/conversation";

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
