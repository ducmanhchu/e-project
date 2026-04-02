import { Outlet } from "react-router";

import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";

export default function AdminLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<main>
					<SidebarTrigger className="mt-2 ml-2" />
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
