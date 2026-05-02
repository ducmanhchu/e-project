import { HugeiconsIcon } from "@hugeicons/react";
import {
	LogoutCircle01Icon,
	Menu01Icon,
	ResetPasswordIcon,
	User03Icon,
} from "@hugeicons/core-free-icons";
import { useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useRevalidator } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

import { Logo } from "@shared/components/logo";
import { Button } from "@shared/components/ui/button";
import { useFetchMe } from "@shared/hooks/use-fetch-me";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@shared/components/ui/avatar";
import { Skeleton } from "@shared/components/ui/skeleton";
import { signOut } from "@shared/api/auth";
import { useAuthStore } from "@shared/store/use-auth-store";
import { cn } from "@shared/lib/utils";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@shared/components/ui/sheet";
import DefaultAvatar from "@shared/assets/avatar/avatar4.png";
import type { HeaderContentProps } from "@shared/types/utils";

const NAV_ITEMS = [
	{ to: "/", label: "Trang chủ", end: true },
	{ to: "/writing", label: "Luyện viết" },
	{ to: "/speaking", label: "Luyện nói" },
	{ to: "/vocabulary", label: "Từ vựng" },
];

export function Header() {
	const queryClient = useQueryClient();
	const revalidator = useRevalidator();
	const { scrollY } = useScroll();
	const [isHeaderHidden, setIsHeaderHidden] = useState(false);

	const { data: me, isLoading } = useFetchMe();
	const clearAuth = useAuthStore((s) => s.clearAuth);

	const logout = useMutation({
		mutationFn: signOut,
		onSuccess: () => {
			clearAuth();
			queryClient.clear();
			revalidator.revalidate();
		},
	});

	useMotionValueEvent(scrollY, "change", (current) => {
		const previous = scrollY.getPrevious();

		if (previous === undefined) return;

		if (current < 80) {
			setIsHeaderHidden(false);
			return;
		}

		setIsHeaderHidden(current > previous);
	});

	return (
		<motion.header
			animate={{ y: isHeaderHidden ? "-100%" : "0%" }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			className="sticky top-0 z-50 w-full h-14 bg-transparent px-4 backdrop-blur-[2px] md:px-10 lg:px-20 md:h-18"
		>
			<DesktopHeaderContent
				me={me}
				isLoading={isLoading}
				onLogout={() => logout.mutate()}
			/>
			<MobileHeaderContent
				me={me}
				isLoading={isLoading}
				onLogout={() => logout.mutate()}
			/>
		</motion.header>
	);
}

function DesktopHeaderContent({ me, isLoading, onLogout }: HeaderContentProps) {
	return (
		<div className="hidden h-full w-full items-center justify-between md:flex">
			<Link to="/">
				<Logo className="h-14 w-32" />
			</Link>
			<DesktopNav />
			<UserAction me={me} isLoading={isLoading} onLogout={onLogout} />
		</div>
	);
}

function MobileHeaderContent({ me, isLoading, onLogout }: HeaderContentProps) {
	return (
		<div className="relative flex h-full w-full items-center justify-between md:hidden">
			<MobileNavSheet />
			<Link to="/" className="absolute left-1/2 -translate-x-1/2">
				<Logo className="h-14 w-32" />
			</Link>
			<UserAction me={me} isLoading={isLoading} onLogout={onLogout} />
		</div>
	);
}

function DesktopNav() {
	const location = useLocation();
	const navRef = useRef<HTMLElement>(null);
	const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
	const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
	const [isPillReady, setIsPillReady] = useState(false);

	const activeTo =
		NAV_ITEMS.find((item) =>
			item.end
				? location.pathname === item.to
				: location.pathname === item.to ||
					location.pathname.startsWith(`${item.to}/`),
		)?.to ?? null;

	useLayoutEffect(() => {
		const updatePill = () => {
			if (!activeTo) {
				activeLinkRef.current = null;
				setIsPillReady(false);
				return;
			}

			const nav = navRef.current;
			const activeLink = activeLinkRef.current;

			if (!nav || !activeLink) {
				setIsPillReady(false);
				return;
			}

			const navRect = nav.getBoundingClientRect();
			const activeRect = activeLink.getBoundingClientRect();

			setPillStyle({
				left: activeRect.left - navRect.left,
				width: activeRect.width,
			});
			setIsPillReady(true);
		};

		updatePill();

		const resizeObserver = new ResizeObserver(updatePill);

		if (navRef.current) resizeObserver.observe(navRef.current);
		if (activeLinkRef.current) resizeObserver.observe(activeLinkRef.current);

		window.addEventListener("resize", updatePill);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", updatePill);
		};
	}, [activeTo, location.pathname]);

	return (
		<nav
			ref={navRef}
			aria-label="Điều hướng chính"
			className="relative flex gap-3 rounded-full border border-primary bg-transparent p-1 whitespace-nowrap"
		>
			<motion.span
				aria-hidden="true"
				initial={false}
				animate={{
					x: pillStyle.left,
					width: pillStyle.width,
					opacity: isPillReady ? 1 : 0,
				}}
				transition={{
					type: "spring",
					stiffness: 380,
					damping: 30,
				}}
				className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-foreground"
			/>
			{NAV_ITEMS.map((item) => {
				const isActive = item.to === activeTo;

				return (
					<NavLink
						key={item.to}
						ref={(node) => {
							if (isActive) activeLinkRef.current = node;
						}}
						to={item.to}
						end={item.end}
						className={cn(
							"relative z-10 flex items-center justify-center rounded-full px-6 py-2 text-sm font-medium transition-colors",
							isActive && "text-background",
						)}
					>
						{item.label}
					</NavLink>
				);
			})}
		</nav>
	);
}

function MobileNavSheet() {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" aria-label="Mở menu điều hướng">
					<HugeiconsIcon icon={Menu01Icon} />
				</Button>
			</SheetTrigger>
			<SheetContent
				className="rounded-r-4xl"
				side="left"
				aria-describedby={undefined}
			>
				<SheetHeader>
					<SheetTitle className="text-sm">Điều hướng</SheetTitle>
				</SheetHeader>
				<nav aria-label="Điều hướng chính" className="flex flex-col gap-4 ps-6">
					{NAV_ITEMS.map((item) => (
						<SheetClose key={item.to} asChild>
							<NavLink
								to={item.to}
								end={item.end}
								className="text-2xl font-bold"
							>
								<i>{item.label}</i>
							</NavLink>
						</SheetClose>
					))}
				</nav>
			</SheetContent>
		</Sheet>
	);
}

function UserAction({ me, isLoading, onLogout }: HeaderContentProps) {
	if (isLoading) {
		return (
			<div className="flex h-10 w-10 items-center justify-center">
				<Skeleton className="h-8 w-8 rounded-full" />
			</div>
		);
	}

	if (!me) {
		return (
			<Button
				variant="outline"
				className="border border-primary transition-transform duration-300 hover:scale-105"
				asChild
			>
				<Link to="/login">
					<span>Đăng nhập</span>
				</Link>
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="rounded-full">
					<Avatar className="border border-primary">
						<AvatarImage
							src={me.avatarUrl ?? DefaultAvatar}
							alt="User avatar"
						/>
						<AvatarFallback>User</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuLabel>{me.fullName}</DropdownMenuLabel>
					<DropdownMenuItem>
						<HugeiconsIcon icon={User03Icon} />
						Trang cá nhân
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link to="/change-password">
							<HugeiconsIcon icon={ResetPasswordIcon} />
							Đổi mật khẩu
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem variant="destructive" onClick={onLogout}>
						<HugeiconsIcon icon={LogoutCircle01Icon} />
						Đăng xuất
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
