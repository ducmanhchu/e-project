import { Outlet } from "react-router";

import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@shared/components/ui/sidebar";
import { AppSidebar } from "@/domains/admin/shell/components/app-sidebar";

export function AdminLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<SidebarTrigger className="mt-2 ms-4" />
				<main className="px-6 py-4">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
