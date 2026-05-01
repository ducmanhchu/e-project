import type { RouteObject } from "react-router";

import { AdminLayout } from "@/domains/admin/shell/admin-layout";
import { Login } from "@/domains/admin/features/auth/pages/login";
import { ReverseTranslate } from "@/domains/admin/features/writing/pages/reverse-translate";
import { SeeAndWrite } from "@/domains/admin/features/writing/pages/see-and-write";
import { Paraphrase } from "@/domains/admin/features/writing/pages/paraphrase";
import { Conversation } from "@/domains/admin/features/speaking/pages/conversation";
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
