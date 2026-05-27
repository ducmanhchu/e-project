import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowDown01Icon,
	LogoutCircle01Icon,
	Mic02Icon,
	TextFontIcon,
} from "@hugeicons/core-free-icons";
import { Link } from "react-router";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@shared/components/ui/sidebar";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/shared/components/ui/avatar";
import { useAuthStore } from "@shared/store/use-auth-store";
import { signOut } from "@shared/api/auth";
import { useFetchMe } from "@shared/hooks/use-fetch-me";

const features = [
	{
		title: "Viết",
		icon: TextFontIcon,
		children: [
			{
				title: "Dịch ngược",
				href: "/admin/reverse-translate",
			},
			{ title: "Quan sát và viết", href: "/admin/see-and-write" },
			{ title: "Viết lại câu", href: "/admin/paraphrase" },
		],
	},
	{
		title: "Nói",
		icon: Mic02Icon,
		children: [{ title: "Hội thoại", href: "/admin/conversation" }],
	},
];

export function AppSidebar() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: me } = useFetchMe();
	const clearAuth = useAuthStore((s) => s.clearAuth);

	const logout = useMutation({
		mutationFn: signOut,
		onSuccess: () => {
			clearAuth();
			queryClient.clear();
			navigate("/admin/login");
		},
	});

	return (
		<Sidebar variant="inset">
			<SidebarHeader className="p-4">
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center gap-4">
						<Avatar>
							<AvatarImage
								src={me?.avatarUrl ?? "https://github.com/shadcn.png"}
								alt="Admin"
							/>
							<AvatarFallback>Admin</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<p className="text-sm font-medium">{me?.fullName}</p>
							<p className="text-xs text-muted-foreground">{me?.email}</p>
						</div>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Kỹ năng</SidebarGroupLabel>
					<SidebarMenu>
						{features.map((item) => (
							<Collapsible
								key={item.title}
								defaultOpen
								className="group/collapsible"
							>
								<SidebarMenuItem>
									<CollapsibleTrigger asChild>
										<SidebarMenuButton>
											<HugeiconsIcon icon={item.icon} />
											{item.title}
											<HugeiconsIcon
												icon={ArrowDown01Icon}
												className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
											/>
										</SidebarMenuButton>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											{item.children.map((child) => (
												<SidebarMenuSubItem key={child.title}>
													<SidebarMenuSubButton asChild>
														<Link to={child.href}>{child.title}</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>
						))}
					</SidebarMenu>
				</SidebarGroup>

				{/* <SidebarGroup>
					<SidebarGroupLabel>Người dùng</SidebarGroupLabel>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<Link to="/admin/users">
									<User />
									Người dùng
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup> */}
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							className="text-red-400 rounded-full hover:text-red-500"
							onClick={() => logout.mutate()}
						>
							<HugeiconsIcon icon={LogoutCircle01Icon} />
							Đăng xuất
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
