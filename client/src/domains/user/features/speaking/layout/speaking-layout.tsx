import { Outlet } from "react-router";

export function SpeakingLayout() {
	return (
		<div className="min-h-full">
			<Outlet />
		</div>
	);
}
