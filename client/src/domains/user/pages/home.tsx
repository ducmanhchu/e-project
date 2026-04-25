import { Link } from "react-router";
import { ArrowUp } from "lucide-react";
import {
	motion,
	useScroll,
	useSpring,
	useTransform,
	type MotionValue,
	type Variants,
} from "motion/react";

import { Button } from "@shared/components/ui/button";
import Vector1 from "@shared/assets/Vector-1.svg";
import Vector2 from "@shared/assets/Vector-2.svg";
import Vector3 from "@shared/assets/Vector-3.svg";
import Vector4 from "@shared/assets/Vector-4.svg";
import Vector5 from "@shared/assets/Vector-5.svg";
import Vector6 from "@shared/assets/Vector-6.svg";
import Vector7 from "@shared/assets/Vector-7.svg";
import Vector8 from "@shared/assets/Vector-8.svg";
import Vector9 from "@shared/assets/Vector-9.svg";
import Vector10 from "@shared/assets/Vector-10.svg";
import Vector11 from "@shared/assets/Vector-11.svg";
import Vector12 from "@shared/assets/Vector-12.svg";
import Vector13 from "@shared/assets/Vector-13.svg";
import Vector14 from "@shared/assets/Vector-14.svg";
import Vector15 from "@shared/assets/Vector-15.svg";
import Vector16 from "@shared/assets/Vector-16.svg";

type BackgroundIllustration = {
	src: string;
	className: string;
	rotate: number;
	delay: number;
};

const heroIllustrations = [
	{
		src: Vector1,
		className: "left-[6%] top-[11%] size-12 md:size-16",
		rotate: -14,
		delay: 0.05,
	},
	{
		src: Vector2,
		className: "left-[23%] top-[7%] size-10 md:size-14",
		rotate: 11,
		delay: 0.15,
	},
	{
		src: Vector3,
		className: "right-[24%] top-[9%] size-12 md:size-16",
		rotate: -8,
		delay: 0.25,
	},
	{
		src: Vector4,
		className: "right-[7%] top-[15%] size-14 md:size-20",
		rotate: 16,
		delay: 0.35,
	},
	{
		src: Vector5,
		className: "left-[10%] top-[34%] size-10 md:size-14",
		rotate: 9,
		delay: 0.45,
	},
	{
		src: Vector6,
		className: "right-[11%] top-[38%] size-11 md:size-16",
		rotate: -18,
		delay: 0.55,
	},
	{
		src: Vector7,
		className: "left-[4%] bottom-[24%] size-12 md:size-18",
		rotate: 20,
		delay: 0.65,
	},
	{
		src: Vector8,
		className: "left-[22%] bottom-[13%] size-10 md:size-14",
		rotate: -10,
		delay: 0.75,
	},
	{
		src: Vector9,
		className: "right-[24%] bottom-[14%] size-11 md:size-16",
		rotate: 13,
		delay: 0.85,
	},
	{
		src: Vector10,
		className: "right-[6%] bottom-[25%] size-12 md:size-18",
		rotate: -12,
		delay: 0.95,
	},
	{
		src: Vector11,
		className: "left-[36%] top-[16%] hidden size-10 lg:block",
		rotate: 18,
		delay: 1.05,
	},
	{
		src: Vector12,
		className: "right-[37%] top-[18%] hidden size-12 lg:block",
		rotate: -16,
		delay: 1.15,
	},
	{
		src: Vector13,
		className: "left-[34%] bottom-[18%] hidden size-11 lg:block",
		rotate: -7,
		delay: 1.25,
	},
	{
		src: Vector14,
		className: "right-[35%] bottom-[17%] hidden size-10 lg:block",
		rotate: 15,
		delay: 1.35,
	},
	{
		src: Vector15,
		className: "left-[15%] top-[58%] size-9 md:size-12",
		rotate: -22,
		delay: 1.45,
	},
	{
		src: Vector16,
		className: "right-[17%] top-[59%] size-9 md:size-12",
		rotate: 19,
		delay: 1.55,
	},
] satisfies readonly BackgroundIllustration[];

const secondSectionIllustrations = [
	{
		src: Vector3,
		className: "left-[8%] top-[12%] size-10 md:size-14",
		rotate: -16,
		delay: 0.15,
	},
	{
		src: Vector7,
		className: "right-[12%] top-[20%] size-12 md:size-18",
		rotate: 14,
		delay: 0.3,
	},
	{
		src: Vector11,
		className: "left-[24%] top-[47%] hidden size-10 md:block",
		rotate: 21,
		delay: 0.45,
	},
	{
		src: Vector15,
		className: "right-[24%] top-[55%] size-9 md:size-12",
		rotate: -12,
		delay: 0.6,
	},
	{
		src: Vector2,
		className: "left-[11%] bottom-[12%] size-11 md:size-16",
		rotate: 9,
		delay: 0.75,
	},
	{
		src: Vector9,
		className: "right-[8%] bottom-[16%] hidden size-12 lg:block",
		rotate: -20,
		delay: 0.9,
	},
] satisfies readonly BackgroundIllustration[];

const thirdSectionIllustrations = [
	{
		src: Vector5,
		className: "left-[14%] top-[14%] size-10 md:size-14",
		rotate: 18,
		delay: 0.2,
	},
	{
		src: Vector13,
		className: "right-[10%] top-[24%] size-11 md:size-16",
		rotate: -15,
		delay: 0.35,
	},
	{
		src: Vector16,
		className: "left-[7%] top-[58%] hidden size-10 md:block",
		rotate: -22,
		delay: 0.5,
	},
	{
		src: Vector8,
		className: "right-[27%] top-[48%] hidden size-9 lg:block",
		rotate: 11,
		delay: 0.65,
	},
	{
		src: Vector12,
		className: "left-[28%] bottom-[12%] size-10 md:size-14",
		rotate: -8,
		delay: 0.8,
	},
	{
		src: Vector4,
		className: "right-[9%] bottom-[10%] size-12 md:size-18",
		rotate: 16,
		delay: 0.95,
	},
] satisfies readonly BackgroundIllustration[];

const heroContainerVariants = {
	hidden: {},
	show: {
		transition: {
			staggerChildren: 0.18,
			delayChildren: 0.35,
		},
	},
} satisfies Variants;

const heroItemVariants = {
	hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
	show: {
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
		transition: { duration: 0.6, ease: "easeOut" },
	},
} satisfies Variants;

function BackgroundIllustrations({
	illustrations,
	y,
}: {
	illustrations: readonly BackgroundIllustration[];
	y: MotionValue<number>;
}) {
	return (
		<motion.div
			aria-hidden="true"
			style={{ y }}
			className="pointer-events-none absolute inset-0 -z-10"
		>
			{illustrations.map((illustration) => (
				<motion.div
					key={`${illustration.src}-${illustration.className}`}
					className={`absolute ${illustration.className}`}
					initial={{
						opacity: 0,
						scale: 0.75,
						rotate: illustration.rotate - 10,
						y: 12,
					}}
					animate={{
						opacity: [0, 0.85, 0.75],
						scale: 1,
						rotate: illustration.rotate,
						y: 0,
					}}
					transition={{
						duration: 1,
						delay: illustration.delay,
						ease: "easeOut",
					}}
				>
					<img
						src={illustration.src}
						alt=""
						className="size-full select-none object-contain"
						draggable={false}
					/>
				</motion.div>
			))}
		</motion.div>
	);
}

export function Home() {
	const { scrollY } = useScroll();
	const smoothScrollY = useSpring(scrollY, {
		stiffness: 80,
		damping: 24,
		mass: 0.4,
	});
	const backgroundY = useTransform(smoothScrollY, [0, 500], [0, -70]);

	return (
		<div className="w-full flex flex-col gap-3">
			<section className="relative isolate min-h-[70vh] overflow-hidden flex flex-col justify-center items-center gap-6 px-4">
				<BackgroundIllustrations
					illustrations={heroIllustrations}
					y={backgroundY}
				/>

				<motion.div
					variants={heroContainerVariants}
					initial="hidden"
					animate="show"
					className="flex flex-col items-center gap-6"
				>
					<motion.h1
						variants={heroItemVariants}
						className="text-4xl/12 font-extrabold font-heading text-center"
					>
						Nâng tầm tiếng Anh <br className="hidden md:block" /> của bạn ngay
						hôm nay.
					</motion.h1>
					<motion.p
						variants={heroItemVariants}
						className="text-base text-center"
					>
						Làm chủ kỹ năng <u>Viết</u> và <u>Nói</u> thông qua nhận xét cá nhân
						hóa từ AI.
						<br />
						Ngừng học thụ động, bắt đầu luyện tập chủ động ngay hôm nay.
					</motion.p>
					<motion.div variants={heroItemVariants}>
						<Button
							asChild
							className="px-6 text-base transition-transform duration-300 hover:scale-105 hover:bg-primary"
						>
							<Link to="/writing">
								Học ngay
								<ArrowUp />
							</Link>
						</Button>
					</motion.div>
				</motion.div>
			</section>
			<section className="relative isolate min-h-svh overflow-hidden">
				<BackgroundIllustrations
					illustrations={secondSectionIllustrations}
					y={backgroundY}
				/>
			</section>
			<section className="relative isolate min-h-svh overflow-hidden">
				<BackgroundIllustrations
					illustrations={thirdSectionIllustrations}
					y={backgroundY}
				/>
			</section>
		</div>
	);
}
