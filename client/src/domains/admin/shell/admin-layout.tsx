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
				<main className="p-4">
					<SidebarTrigger />
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
