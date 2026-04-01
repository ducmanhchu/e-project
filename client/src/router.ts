import { createBrowserRouter, redirect } from "react-router";
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/admin/Login";
import BackTranslate from "./pages/admin/BackTranslate";
import SeeAndWrite from "./pages/admin/SeeAndWrite";
import Paraphrase from "./pages/admin/Paraphrase";
import Conversation from "./pages/admin/Conversation";

export const router = createBrowserRouter([
	{
		path: "/",
		Component: UserLayout,
	},
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
			{ path: "conversation", Component: Conversation }
		]
	},
]);
