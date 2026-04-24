import { useState } from "react";
import { Link, NavLink } from "react-router";
import { Settings, LogOut, Menu, User } from "lucide-react";
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
import type { User as AuthUser } from "@shared/types/auth";

const NAV_ITEMS = [
	{ to: "/", label: "Trang chủ", end: true },
	{ to: "/writing", label: "Luyện viết" },
	{ to: "/speaking", label: "Luyện nói" },
	{ to: "/vocabulary", label: "Từ vựng" },
];

export function Header() {
	const queryClient = useQueryClient();
	const { scrollY } = useScroll();
	const [isHeaderHidden, setIsHeaderHidden] = useState(false);

	const { data: me, isLoading } = useFetchMe();
	const clearAuth = useAuthStore((s) => s.clearAuth);

	const logout = useMutation({
		mutationFn: signOut,
		onSuccess: () => {
			clearAuth();
			queryClient.clear();
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

type HeaderContentProps = {
	me?: AuthUser;
	isLoading: boolean;
	onLogout: () => void;
};

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
	return (
		<nav
			aria-label="Điều hướng chính"
			className="flex gap-3 rounded-full border border-primary bg-transparent p-1 whitespace-nowrap"
		>
			{NAV_ITEMS.map((item) => (
				<NavLink
					key={item.to}
					to={item.to}
					end={item.end}
					className={({ isActive }) =>
						cn(
							"relative flex items-center justify-center rounded-full px-6 py-2 text-sm font-medium",
							isActive && "text-background",
						)
					}
				>
					{({ isActive }) => (
						<>
							{isActive && (
								<motion.span
									layoutId="active-nav-pill"
									className="absolute inset-0 rounded-full bg-foreground"
									transition={{
										type: "spring",
										stiffness: 380,
										damping: 30,
									}}
								/>
							)}
							<span className="relative z-10">{item.label}</span>
						</>
					)}
				</NavLink>
			))}
		</nav>
	);
}

function MobileNavSheet() {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" aria-label="Mở menu điều hướng">
					<Menu />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" aria-describedby={undefined}>
				<SheetHeader>
					<SheetTitle>Điều hướng</SheetTitle>
				</SheetHeader>
				<nav aria-label="Điều hướng chính" className="flex flex-col gap-4 ps-6">
					{NAV_ITEMS.map((item) => (
						<SheetClose key={item.to} asChild>
							<NavLink
								to={item.to}
								end={item.end}
								className="text-2xl font-semibold"
							>
								{item.label}
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
			<Button asChild>
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
							src={me.avatarUrl ?? "https://github.com/shadcn.png"}
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
						<User />
						Trang cá nhân
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Settings />
						Cài đặt
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem variant="destructive" onClick={onLogout}>
						<LogOut />
						Đăng xuất
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
