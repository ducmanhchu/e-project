import { Link } from "react-router";
import { ChevronDown, LogIn, Moon, Pen, Speech, Sun, User } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "./ui/sidebar";

const features = [
	{
		title: "Viết",
		icon: Pen,
		children: [
			{
				title: "Dịch ngược",
				href: "/admin/back-translate",
			},
			{ title: "Nhìn và viết", href: "/admin/see-and-write" },
			{ title: "Diễn đạt câu", href: "/admin/paraphrase" },
		],
	},
	{
		title: "Nói",
		icon: Speech,
		children: [{ title: "Hội thoại", href: "/admin/conversation" }],
	},
];

export default function AppSidebar() {
	const { theme, toggleTheme } = useTheme();

	return (
		<Sidebar variant="inset">
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
											<item.icon />
											{item.title}
											<ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
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
					<SidebarMenuItem className="flex items-center gap-2">
						<SidebarMenuButton
							onClick={toggleTheme}
							className="w-auto shrink-0"
						>
							{theme === "light" ? <Moon /> : <Sun />}
							<span className="sr-only">Chuyển đổi giao diện</span>
						</SidebarMenuButton>
						<SidebarMenuButton asChild className="flex-1">
							<Link to="/login">
								<LogIn />
								Đăng nhập
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
