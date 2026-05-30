import { ConversationIcon } from "@hugeicons/core-free-icons";

import { motion } from "motion/react";

import { MethodCard } from "@/domains/user/components/method-card";

export function SpeakingMethod() {
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
					className="col-start-2"
				>
					<MethodCard
						icon={ConversationIcon}
						title="Hội thoại"
						description="Tham gia vào các tình huống giao tiếp mô phỏng thực tế cùng AI để rèn luyện phản xạ tự nhiên và sự trôi chảy."
						to="conversation"
					/>
				</motion.div>
			</motion.div>
		</motion.div>
	);
}
