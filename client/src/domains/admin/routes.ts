import type { RouteObject } from "react-router";

import { AdminLayout } from "@admin/shell/admin-layout";
import { Login } from "@admin/features/auth/pages/login";
import { ReverseTranslate } from "@/domains/admin/features/writing/methods/reverse-translate/pages";
import { SeeAndWrite } from "@/domains/admin/features/writing/methods/see-and-write/pages";
import { Paraphrase } from "@/domains/admin/features/writing/methods/paraphrase/pages";
import { Conversation } from "@/domains/admin/features/speaking/methods/conversation/pages";
import { Dashboard } from "@/domains/admin/features/dashboard/pages";
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
			{ path: "/admin/reverse-translate", Component: ReverseTranslate },
			{ path: "/admin/see-and-write", Component: SeeAndWrite },
			{ path: "/admin/paraphrase", Component: Paraphrase },
			{ path: "/admin/conversation", Component: Conversation },
			{ path: "/admin/dashboard", Component: Dashboard },
		],
	},
];
