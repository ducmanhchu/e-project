import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteFallback } from "@shared/components/route-fallback";
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
					<Suspense fallback={<RouteFallback />}>
						<Outlet />
					</Suspense>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
