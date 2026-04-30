export function Vocabulary() {
	return (
		<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
			<div className="flex flex-col gap-4">
				<div className="flex border border-primary rounded-4xl p-4">
					<p className="text-lg font-bold">Từ mới hôm nay</p>
				</div>
				<div className="flex border border-primary rounded-4xl p-4">
					<p className="text-lg font-bold">Nối từ</p>
				</div>
			</div>
			<div className="col-span-2">
				<h1 className="text-3xl font-extrabold">Từ vựng của tôi</h1>
			</div>
		</div>
	);
}
