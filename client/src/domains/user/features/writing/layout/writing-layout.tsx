import { Outlet } from "react-router";

export function WritingLayout() {
	return (
		<div className="min-h-full w-full">
			<Outlet />
		</div>
	);
}
