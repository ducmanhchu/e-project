import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteFallback } from "@shared/components/route-fallback";
import { Header } from "@user/shell/components/header";
import { Footer } from "@user/shell/components/footer";

export function UserLayout() {
	return (
		<div className="flex flex-col">
			<div className="flex flex-col min-h-svh">
				<Header />
				<main className="flex flex-1 flex-col w-full py-8 px-4 md:px-10 lg:px-20">
					<Suspense fallback={<RouteFallback />}>
						<Outlet />
					</Suspense>
				</main>
			</div>
			<Footer />
		</div>
	);
}
