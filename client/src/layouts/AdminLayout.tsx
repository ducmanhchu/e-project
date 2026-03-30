import { Outlet } from "react-router";

export default function AdminLayout() {
	return (
		<>
			<aside></aside>
			<main>
				<Outlet />
			</main>
		</>
	);
}
