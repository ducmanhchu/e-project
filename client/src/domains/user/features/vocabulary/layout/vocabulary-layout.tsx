import { Outlet } from "react-router";

/**
 * Khung layout module từ vựng: nội dung chính + sidebar.
 */
export function VocabularyLayout() {
	return (
		<div className="grid grid-cols-1 gap-10 md:gap-6 md:grid-cols-4">
			<div className="col-span-3 flex flex-col gap-12">
				<Outlet />
			</div>
			<div className="flex flex-col gap-4 order-first md:order-last">
				<div className="flex border border-primary rounded-4xl p-4">
					<p className="text-lg font-bold">Nối từ</p>
				</div>
			</div>
		</div>
	);
}
