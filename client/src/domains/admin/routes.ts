import type { RouteObject } from "react-router";

import { AdminLayout } from "@admin/shell/admin-layout";
import { Login } from "@admin/features/auth/pages/login";
import { ReverseTranslate } from "@admin/features/writing/methods/reverse-translate/pages/reverse-translate";
import { SeeAndWrite } from "@admin/features/writing/methods/see-and-write/pages/see-and-write";
import { Paraphrase } from "@admin/features/writing/methods/paraphrase/pages/paraphrase";
import { Conversation } from "@admin/features/speaking/methods/conversation/pages/conversation";
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
		],
	},
];
