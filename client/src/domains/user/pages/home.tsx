import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";

type HeroToken =
	| { type: "word"; text: string; italic?: boolean; spaceAfter?: boolean }
	| { type: "br" };

function ScrollRevealWords({
	text,
	className,
	stagger = 0.035,
	duration = 0.35,
	y = 14,
	viewportAmount = 0.5,
}: {
	text: string;
	className?: string;
	stagger?: number;
	duration?: number;
	y?: number;
	viewportAmount?: number;
}) {
	const shouldReduceMotion = useReducedMotion();

	const lines = text.split("\n");
	const wordsByLine = lines.map((line) =>
		line.trim().split(/\s+/).filter(Boolean),
	);

	return (
		<motion.p
			className={className}
			initial="hidden"
			whileInView="show"
			viewport={{ amount: viewportAmount, once: true }}
			variants={{
				hidden: {},
				show: {
					transition: {
						staggerChildren: shouldReduceMotion ? 0 : stagger,
					},
				},
			}}
		>
			{wordsByLine.map((words, lineIdx) => (
				<span key={`line-${lineIdx}`}>
					{words.map((w, wordIdx) => (
						<motion.span
							key={`w-${lineIdx}-${wordIdx}-${w}`}
							className="inline-block will-change-transform"
							variants={{
								hidden: { opacity: 0, y: shouldReduceMotion ? 0 : y },
								show: {
									opacity: 1,
									y: 0,
									transition: {
										duration: shouldReduceMotion ? 0 : duration,
										ease: "easeOut",
									},
								},
							}}
						>
							{w}
							{wordIdx < words.length - 1 ? "\u00A0" : ""}
						</motion.span>
					))}
					{lineIdx < wordsByLine.length - 1 ? <br /> : null}
				</span>
			))}
		</motion.p>
	);
}

const HERO_TOKENS: HeroToken[] = [
	{ type: "word", text: "Nâng", spaceAfter: true },
	{ type: "word", text: "tầm", spaceAfter: true },
	{ type: "word", text: "tiếng", spaceAfter: true },
	{ type: "word", text: "Anh", spaceAfter: true },
	{ type: "br" },
	{ type: "word", text: "của", spaceAfter: true },
	{ type: "word", text: "bạn", spaceAfter: true },
	{ type: "word", text: "ngay", spaceAfter: true },
	{ type: "word", text: "hôm", spaceAfter: true },
	{ type: "word", text: "nay." },
];

export function Home() {
	const shouldReduceMotion = useReducedMotion();

	const containerVariants = {
		hidden: {},
		show: {
			transition: {
				staggerChildren: shouldReduceMotion ? 0 : 0.06,
			},
		},
	} as const;

	const itemVariants = {
		hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
		show: {
			opacity: 1,
			y: 0,
			transition: { duration: shouldReduceMotion ? 0 : 0.45, ease: "easeOut" },
		},
	} as const;

	const linkVariants = {
		hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
		show: {
			opacity: 1,
			y: 0,
			transition: {
				duration: shouldReduceMotion ? 0 : 0.35,
				ease: "easeOut",
				delay: shouldReduceMotion ? 0 : 0.7,
			},
		},
	} as const;

	const aboutText =
		"Làm chủ kỹ năng Viết và Nói thông qua nhận xét cá nhân hóa từ AI. Ngừng học thụ động, bắt đầu luyện tập chủ động ngay hôm nay.\nCác gợi ý chỉnh sửa chuyên sâu và thực tế, bạn sẽ nhanh chóng hoàn thiện khả năng diễn đạt theo phong cách của người bản xứ. Hãy khơi dậy sự tự tin và sẵn sàng chinh phục những nấc thang mới trong sự nghiệp cũng như cuộc sống toàn cầu.";

	const howItWorks = [
		{
			step: "01",
			title: "Chọn kỹ năng cần học",
			body: (
				<>
					Wordwise tập trung hỗ trợ 2 kỹ năng chính: <u>Viết</u> và <u>Nói</u>.
					Đồng thời cung cấp không gian riêng giúp bạn <u>luyện tập từ vựng</u>{" "}
					một cách hiệu quả hơn.
				</>
			),
		},
		{
			step: "02",
			title: "Chọn phương pháp",
			body: (
				<>
					Mỗi kỹ năng sẽ có những phương pháp học tập riêng biệt. Mỗi phương
					pháp sẽ có cách tiếp cận khác nhau, giúp cho trải nghiệm học tập trở
					nên phong phú và đa dạng hơn.
				</>
			),
		},
		{
			step: "03",
			title: "Chọn bài tập",
			body: (
				<>
					Khi đã chọn phương pháp, hệ thống sẽ cung cấp danh sách các bài tập
					tương ứng, bạn có thể chọn trình độ và chủ đề của bài tập cho phù hợp
					với bản thân. Hãy chọn một bài bất kỳ để bắt đầu học ngay.
				</>
			),
		},
	] as const;

	return (
		<div className="w-full flex flex-col gap-10">
			<section className="min-h-[85vh] grid grid-cols-1 md:grid-cols-3">
				<div className="col-span-2 flex flex-col justify-center">
					<motion.h1
						className="font-black text-5xl/15 md:text-7xl/20"
						variants={containerVariants}
						initial="hidden"
						animate="show"
					>
						{HERO_TOKENS.map((t, idx) => {
							if (t.type === "br") {
								return <br key={`br-${idx}`} className="hidden xl:block" />;
							}

							return (
								<motion.span
									key={`w-${idx}-${t.text}`}
									variants={itemVariants}
									className={[
										"inline-block will-change-transform",
										t.italic ? "italic" : "",
										t.spaceAfter ? "mr-3" : "",
									]
										.filter(Boolean)
										.join(" ")}
								>
									{t.text}
								</motion.span>
							);
						})}
					</motion.h1>
				</div>
				<div className="flex flex-col justify-end">
					<motion.div
						variants={linkVariants}
						initial="hidden"
						animate="show"
						className="flex justify-end"
						whileHover={{ x: 20 }}
					>
						<Link to="/writing" className="flex justify-end gap-2">
							<p className="text-2xl font-medium">Bắt đầu ngay</p>
							<HugeiconsIcon
								icon={ArrowRight02Icon}
								size={28}
								className="self-center"
							/>
						</Link>
					</motion.div>
				</div>
			</section>

			<section className="h-full py-12 md:py-16 xl:py-20 rounded-4xl bg-primary text-primary-foreground -mx-4 md:-mx-10 lg:-mx-20 ps-1 pe-4 md:px-10 lg:px-20 flex flex-col justify-center items-end">
				<ScrollRevealWords
					className="font-bold text-base/7 md:text-3xl/14 text-right w-[75%]"
					text={aboutText}
					stagger={0.035}
					duration={0.35}
					y={14}
					viewportAmount={0.5}
				/>
			</section>

			<section className="my-18">
				<motion.div
					initial="hidden"
					whileInView="show"
					viewport={{ amount: 0.35, once: true }}
					variants={{
						hidden: {},
						show: {
							transition: {
								staggerChildren: shouldReduceMotion ? 0 : 0.16,
							},
						},
					}}
				>
					<motion.h2
						className="text-5xl font-extrabold mb-8"
						variants={{
							hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 18 },
							show: {
								opacity: 1,
								y: 0,
								transition: {
									duration: shouldReduceMotion ? 0 : 0.5,
									ease: "easeOut",
								},
							},
						}}
					>
						Sử dụng như thế nào?
					</motion.h2>

					<motion.div
						className="flex flex-col md:flex-row gap-6"
						variants={{
							hidden: {},
							show: {
								transition: {
									staggerChildren: shouldReduceMotion ? 0 : 0.14,
									delayChildren: shouldReduceMotion ? 0 : 0.05,
								},
							},
						}}
					>
						{howItWorks.map((card) => (
							<motion.div
								key={card.step}
								className="flex flex-col gap-8 bg-primary text-primary-foreground rounded-4xl p-8 w-full h-[70vh]"
								variants={{
									hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 22 },
									show: {
										opacity: 1,
										y: 0,
										transition: {
											duration: shouldReduceMotion ? 0 : 0.5,
											ease: "easeOut",
										},
									},
								}}
							>
								<p className="text-4xl font-extrabold bg-foreground text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center">
									{card.step}
								</p>
								<div className="flex flex-col gap-2">
									<h3 className="text-2xl font-extrabold">{card.title}</h3>
									<p className="text-lg">{card.body}</p>
								</div>
							</motion.div>
						))}
					</motion.div>
				</motion.div>
			</section>
		</div>
	);
}
