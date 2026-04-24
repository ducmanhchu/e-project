import { Outlet } from "react-router";

import { Header } from "@user/layouts/header";
import { Footer } from "@user/layouts/footer";

export function UserLayout() {
	return (
		<div className="flex flex-col gap-4 min-h-svh">
			<Header />
			<div className="flex-1 px-4 md:px-10 lg:px-20">
				<Outlet />
			</div>
			<Footer />
		</div>
	);
}
