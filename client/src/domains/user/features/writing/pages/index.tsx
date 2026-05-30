import {
	TextFontIcon,
	ViewIcon,
	ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";

import { motion } from "motion/react";

import { MethodCard } from "@/domains/user/components/method-card";

export function WritingMethod() {
	return (
		<motion.div
			className="flex min-h-full flex-col items-center justify-center gap-10"
			initial="hidden"
			animate="show"
			variants={{
				hidden: {},
				show: {
					transition: {
						staggerChildren: 0.12,
						delayChildren: 0.05,
					},
				},
			}}
		>
			<div className="flex flex-col items-center justify-center gap-3">
				<motion.h1
					className="text-4xl font-extrabold"
					variants={{
						hidden: { opacity: 0, y: 16 },
						show: {
							opacity: 1,
							y: 0,
							transition: { duration: 0.35, ease: "easeOut" },
						},
					}}
				>
					Phương pháp học
				</motion.h1>
				<motion.p
					className="text-base"
					variants={{
						hidden: { opacity: 0, y: 16 },
						show: {
							opacity: 1,
							y: 0,
							transition: { duration: 0.35, ease: "easeOut" },
						},
					}}
				>
					Chọn phương pháp học phù hợp với bạn
				</motion.p>
			</div>

			<motion.div
				className="grid w-full grid-cols-1 auto-rows-fr gap-4 md:grid-cols-3"
				variants={{
					hidden: {},
					show: { transition: { staggerChildren: 0.12 } },
				}}
			>
				<motion.div
					variants={{
						hidden: { opacity: 0, y: 16 },
						show: {
							opacity: 1,
							y: 0,
							transition: { duration: 0.35, ease: "easeOut" },
						},
					}}
				>
					<MethodCard
						icon={TextFontIcon}
						title="Dịch ngược"
						description="Chuyển đổi các câu mẫu từ tiếng Việt sang tiếng Anh để rèn luyện tư duy ngôn ngữ trực tiếp và chuẩn xác."
						to="reverse-translate"
					/>
				</motion.div>
				<motion.div
					variants={{
						hidden: { opacity: 0, y: 16 },
						show: {
							opacity: 1,
							y: 0,
							transition: { duration: 0.35, ease: "easeOut" },
						},
					}}
				>
					<MethodCard
						icon={ViewIcon}
						title="Quan sát và viết"
						description="Quan sát hình ảnh hoặc ngữ cảnh trực quan để mô tả bằng tiếng Anh, giúp tăng khả năng phản xạ và vốn từ thực tế."
						to="see-and-write"
					/>
				</motion.div>
				<motion.div
					variants={{
						hidden: { opacity: 0, y: 16 },
						show: {
							opacity: 1,
							y: 0,
							transition: { duration: 0.35, ease: "easeOut" },
						},
					}}
				>
					<MethodCard
						icon={ArrowReloadHorizontalIcon}
						title="Viết lại câu"
						description="Diễn đạt một ý tưởng bằng nhiều cách khác nhau để nâng cao sự linh hoạt trong câu từ và phong cách chuẩn bản xứ."
						to="paraphrase"
					/>
				</motion.div>
			</motion.div>
		</motion.div>
	);
}
