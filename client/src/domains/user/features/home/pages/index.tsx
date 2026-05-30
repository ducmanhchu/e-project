import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

import I1 from "@shared/assets/illustration/i1.svg?react";
import I2 from "@shared/assets/illustration/i2.svg?react";
import I3 from "@shared/assets/illustration/i3.svg?react";
import I4 from "@shared/assets/illustration/i4.svg?react";
import I5 from "@shared/assets/illustration/i5.svg?react";
import I6 from "@shared/assets/illustration/i6.svg?react";
import I7 from "@shared/assets/illustration/i7.svg?react";
import I8 from "@shared/assets/illustration/i8.svg?react";
import I9 from "@shared/assets/illustration/i9.svg?react";
import I10 from "@shared/assets/illustration/i10.svg?react";
import Circle from "@shared/assets/illustration/circle.svg?react";
import Personalize from "@shared/assets/illustration/personalize.svg?react";
import Smart from "@shared/assets/illustration/smart.svg?react";

type HeroToken =
	| { type: "word"; text: string; italic?: boolean; spaceAfter?: boolean }
	| { type: "br" };

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

	const marqueeItemsRow1 = [
		{ type: "word" as const, key: "w1", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i1",
			node: <I1 className="size-16 text-secondary-black" />,
		},
		{ type: "word" as const, key: "w2", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i2",
			node: <I2 className="size-16 text-secondary-black" />,
		},
		{ type: "word" as const, key: "w3", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i3",
			node: <I3 className="size-16 text-secondary-black" />,
		},
		{ type: "word" as const, key: "w4", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i4",
			node: <I4 className="size-16 text-secondary-black" />,
		},
		{ type: "word" as const, key: "w5", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i5",
			node: <I5 className="size-16 text-secondary-black" />,
		},
	] as const;

	const marqueeItemsRow2 = [
		{ type: "word" as const, key: "w6", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i6",
			node: <I6 className="size-16 text-secondary-black" />,
		},
		{ type: "word" as const, key: "w7", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i7",
			node: <I7 className="size-16 text-secondary-black" />,
		},
		{ type: "word" as const, key: "w8", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i8",
			node: <I8 className="size-16 text-secondary-black" />,
		},
		{ type: "word" as const, key: "w9", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i9",
			node: <I9 className="size-16 text-secondary-black" />,
		},
		{ type: "word" as const, key: "w10", node: "WORDWISE" },
		{
			type: "icon" as const,
			key: "i10",
			node: <I10 className="size-16 text-secondary-black" />,
		},
	] as const;

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

	const heroIntroDuration = shouldReduceMotion ? 0 : 0.45;
	const heroCtaDuration = shouldReduceMotion ? 0 : 0.35;

	const heroIntroVariants = {
		hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
		show: {
			opacity: 1,
			y: 0,
			transition: {
				duration: heroIntroDuration,
				ease: "easeOut",
				delay: 0,
			},
		},
	} as const;

	const heroCtaVariants = {
		hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
		show: {
			opacity: 1,
			y: 0,
			transition: {
				duration: heroCtaDuration,
				ease: "easeOut",
				delay: shouldReduceMotion ? 0 : heroIntroDuration,
			},
		},
	} as const;

	const heroFeatureCardsContainerVariants = {
		hidden: {},
		show: {
			transition: {
				staggerChildren: shouldReduceMotion ? 0 : 0.14,
				delayChildren: shouldReduceMotion
					? 0
					: heroIntroDuration + heroCtaDuration,
			},
		},
	} as const;

	const heroFeatureCardVariants = {
		hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
		show: {
			opacity: 1,
			y: 0,
			transition: {
				duration: shouldReduceMotion ? 0 : 0.45,
				ease: "easeOut",
			},
		},
	} as const;

	const howItWorks = [
		{
			step: "01",
			title: "Chọn kỹ năng",
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
		<div className="w-full flex flex-col gap-14">
			<section className="min-h-[80vh] flex flex-col gap-8 justify-around">
				<div className="grid grid-cols-1 md:grid-cols-3 content-center">
					<div className="col-span-2 justify-self-start">
						<motion.h1
							className="font-black text-5xl/15 md:text-6xl/20"
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
					<div className="justify-self-end flex flex-col gap-4 justify-between items-start">
						<motion.p
							className="text-base/7 font-medium text-secondary-black"
							variants={heroIntroVariants}
							initial="hidden"
							animate="show"
						>
							Wordwise là nền tảng luyện kỹ năng Viết và Nói đột phá tích hợp
							Trí tuệ nhân tạo giúp bạn làm chủ tiếng Anh thông qua thực hành
							chủ động.
						</motion.p>

						<motion.div
							variants={heroCtaVariants}
							initial="hidden"
							animate="show"
							className="flex justify-end"
						>
							<Link
								to="/writing"
								className="group flex items-center justify-between gap-8 rounded-full bg-secondary-black text-secondary-white px-2 py-2 transition-colors duration-300 hover:bg-secondary-yellow hover:text-secondary-black"
							>
								<p className="text-base font-normal ps-2">Bắt đầu ngay</p>
								<div className="relative size-8 rounded-full bg-secondary-yellow overflow-hidden transition-colors duration-300 group-hover:bg-secondary-black">
									<div className="absolute inset-0 flex items-center justify-start gap-4 -translate-x-9 transition-transform duration-300 ease-out group-hover:translate-x-1">
										<HugeiconsIcon
											icon={ArrowRight02Icon}
											size={22}
											className="w-6 shrink-0 text-secondary-black transition-colors duration-300 group-hover:text-secondary-white"
										/>
										<HugeiconsIcon
											icon={ArrowRight02Icon}
											size={22}
											className="w-6 shrink-0 text-secondary-black transition-colors duration-300 group-hover:text-secondary-white"
										/>
									</div>
								</div>
							</Link>
						</motion.div>
					</div>
				</div>

				<motion.div
					className="flex flex-col gap-3 md:flex-row"
					variants={heroFeatureCardsContainerVariants}
					initial="hidden"
					animate="show"
				>
					<motion.div
						className="min-h-[30vh] flex-1 p-5 flex flex-col items-start justify-between rounded-4xl bg-secondary-orange"
						variants={heroFeatureCardVariants}
					>
						<span>
							<Circle className="size-8 text-orange-950" />
						</span>
						<div className="flex flex-col gap-2">
							<p className="text-2xl text-secondary-black font-black">
								Chủ động
							</p>
							<p className="text-sm font-light">
								Thay đổi hoàn toàn cách học từ thụ động sang thực hành kỹ năng
								liên tục.
							</p>
						</div>
					</motion.div>
					<motion.div
						className="min-h-[30vh] flex-1 p-5 flex flex-col items-start justify-between rounded-4xl bg-secondary-green"
						variants={heroFeatureCardVariants}
					>
						<span>
							<Personalize className="size-8 text-green-950" />
						</span>
						<div className="flex flex-col gap-2">
							<p className="text-2xl text-secondary-black font-black">
								Cá nhân hóa
							</p>
							<p className="text-sm font-light">
								Mọi phản hồi, sửa lỗi và gợi ý hành văn đều được AI tinh chỉnh
								riêng biệt.
							</p>
						</div>
					</motion.div>
					<motion.div
						className="min-h-[30vh] flex-1 p-5 flex flex-col items-start justify-between rounded-4xl bg-secondary-blue"
						variants={heroFeatureCardVariants}
					>
						<span>
							<Smart className="size-8 text-blue-950" />
						</span>
						<div className="flex flex-col gap-2">
							<p className="text-2xl text-secondary-black font-black">
								Thông minh
							</p>
							<p className="text-sm font-light">
								Tận dụng sức mạnh của Trí tuệ nhân tạo để mang lại trải nghiệm
								tương tác học tập có chiều sâu.
							</p>
						</div>
					</motion.div>
				</motion.div>
			</section>

			<section className="flex flex-col gap-3 -mx-4 md:-mx-10 lg:-mx-20">
				<div className="overflow-hidden">
					<div
						className={[
							"ww-marquee-track ww-marquee-left flex items-center gap-4",
							shouldReduceMotion ? "motion-reduce:animate-none" : "",
						]
							.filter(Boolean)
							.join(" ")}
						style={{ "--ww-marquee-duration": "22s" } as CSSProperties}
					>
						{[0, 1].flatMap((copyIdx) =>
							marqueeItemsRow1.map((item) => {
								const common =
									item.type === "word"
										? "text-5xl font-black px-8 py-4 bg-secondary-black text-secondary-white rounded-full hover:bg-secondary-pink hover:text-secondary-black transition-colors duration-200"
										: "shrink-0";

								return (
									<span
										key={`${copyIdx}-${item.key}`}
										className={common}
										aria-hidden={copyIdx === 1}
									>
										{item.node}
									</span>
								);
							}),
						)}
					</div>
				</div>

				<div className="overflow-hidden">
					<div
						className={[
							"ww-marquee-track ww-marquee-right flex items-center gap-4",
							shouldReduceMotion ? "motion-reduce:animate-none" : "",
						]
							.filter(Boolean)
							.join(" ")}
						style={{ "--ww-marquee-duration": "22s" } as CSSProperties}
					>
						{[0, 1].flatMap((copyIdx) =>
							marqueeItemsRow2.map((item) => {
								const common =
									item.type === "word"
										? "text-5xl font-black px-8 py-4 bg-secondary-black text-secondary-white rounded-full hover:bg-secondary-pink hover:text-secondary-black transition-colors duration-200"
										: "shrink-0";

								return (
									<span
										key={`${copyIdx}-${item.key}`}
										className={common}
										aria-hidden={copyIdx === 1}
									>
										{item.node}
									</span>
								);
							}),
						)}
					</div>
				</div>
			</section>

			<section className="my-14">
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
								className="flex flex-col gap-8 bg-secondary-yellow text-secondary-black rounded-4xl p-8 w-full justify-between h-[60vh]"
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
								<div className="flex flex-col gap-6">
									<p className="text-2xl font-extrabold bg-secondary-black text-secondary-white rounded-full size-12 flex items-center justify-center">
										{card.step}
									</p>
									<h3 className="text-3xl font-extrabold">{card.title}</h3>
								</div>
								<p className="text-lg font-light">{card.body}</p>
							</motion.div>
						))}
					</motion.div>
				</motion.div>
			</section>
		</div>
	);
}
