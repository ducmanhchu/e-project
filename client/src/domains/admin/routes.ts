import type { RouteObject } from "react-router";

import { AdminLayout } from "@admin/layouts/admin-layout";
import { Login } from "@admin/pages/login";
import { BackTranslate } from "@admin/pages/back-translate";
import { SeeAndWrite } from "@admin/pages/see-and-write";
import { Paraphrase } from "@admin/pages/paraphrase";
import { Conversation } from "@admin/pages/conversation";
import { requireAdminLoader } from "@shared/lib/auth-loaders";

export const adminRoutes: RouteObject[] = [
	{
		path: "/admin/login",
		Component: Login,
	},
	{
		Component: AdminLayout,
		loader: requireAdminLoader,
		children: [
			{ path: "/admin/back-translate", Component: BackTranslate },
			{ path: "/admin/see-and-write", Component: SeeAndWrite },
			{ path: "/admin/paraphrase", Component: Paraphrase },
			{ path: "/admin/conversation", Component: Conversation },
		],
	},
];
