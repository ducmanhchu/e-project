import {
	TextFontIcon,
	ViewIcon,
	ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";

import { MethodCard } from "@/domains/user/components/method-card";

export function WritingMethod() {
	return (
		<div className="flex min-h-full flex-col items-center justify-center gap-10">
			<div className="flex flex-col items-center justify-center gap-3">
				<h1 className="text-4xl font-extrabold">Phương pháp học</h1>
				<p className="text-base">Chọn phương pháp học phù hợp với bạn</p>
			</div>
			<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 auto-rows-fr">
				<MethodCard
					icon={TextFontIcon}
					title="Dịch ngược"
					description="Chuyển đổi các câu mẫu từ tiếng Việt sang tiếng Anh để rèn luyện tư duy ngôn ngữ trực tiếp và chuẩn xác."
					to="reverse-translate"
				/>
				<MethodCard
					icon={ViewIcon}
					title="Quan sát và viết"
					description="Quan sát hình ảnh hoặc ngữ cảnh trực quan để mô tả bằng tiếng Anh, giúp tăng khả năng phản xạ và vốn từ thực tế."
					to="see-and-write"
				/>
				<MethodCard
					icon={ArrowReloadHorizontalIcon}
					title="Viết lại câu"
					description="Diễn đạt một ý tưởng bằng nhiều cách khác nhau để nâng cao sự linh hoạt trong câu từ và phong cách chuẩn bản xứ."
					to="paraphrase"
				/>
			</div>
		</div>
	);
}
