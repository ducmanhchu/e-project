import { ConversationIcon } from "@hugeicons/core-free-icons";

import { MethodCard } from "@/domains/user/components/method-card";

export function SpeakingMethod() {
	return (
		<div className="flex min-h-full flex-col items-center justify-center gap-10">
			<div className="flex flex-col items-center justify-center gap-3">
				<h1 className="text-4xl font-extrabold">Phương pháp học</h1>
				<p className="text-base">Chọn phương pháp học phù hợp với bạn</p>
			</div>
			<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 auto-rows-fr">
				<MethodCard
					icon={ConversationIcon}
					title="Hội thoại"
					description="Tham gia vào các tình huống giao tiếp mô phỏng thực tế cùng AI để rèn luyện phản xạ tự nhiên và sự trôi chảy."
					to="conversation"
					className="col-start-2"
				/>
			</div>
		</div>
	);
}
