import { Outlet } from "react-router";

/**
 * Khung layout module từ vựng: nội dung chính + sidebar.
 */
export function VocabularyLayout() {
	return (
		<div className="min-h-full w-full">
			<Outlet />
		</div>
	);
}
