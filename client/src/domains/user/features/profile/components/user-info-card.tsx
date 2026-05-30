import { Badge } from "@/shared/components/ui/badge";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/shared/components/ui/avatar";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { User } from "@/shared/types/auth";
import { cn } from "@/shared/lib/utils";
import { formatCreatedAt } from "@user/features/profile/utils/profile-display";

type UserInfoCardProps = {
	user: User | undefined;
	isLoading?: boolean;
};

function getInitials(fullName: string): string {
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
	return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Thẻ thông tin người dùng (avatar, tên, email, ngày tạo).
 * @param props.user — dữ liệu từ useFetchMe
 * @param props.isLoading — hiện skeleton khi đang tải
 */
export function UserInfoCard({ user, isLoading = false }: UserInfoCardProps) {
	if (isLoading) {
		return (
			<Card className="h-full">
				<CardContent className="flex items-center gap-4">
					<Skeleton className="size-16 shrink-0 rounded-full" />
					<div className="flex flex-1 flex-col gap-2">
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-56" />
						<Skeleton className="h-4 w-32" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!user) return null;

	return (
		<Card className="h-full">
			<CardContent className="flex items-center gap-4">
				<Avatar
					size="lg"
					className={cn(user.role === "admin" ? "ring-2 ring-sky-600" : "")}
				>
					{user.avatarUrl ? (
						<AvatarImage src={user.avatarUrl} alt={user.fullName} />
					) : null}
					<AvatarFallback className="text-lg">
						{getInitials(user.fullName)}
					</AvatarFallback>
				</Avatar>
				<div className="flex min-w-0 flex-col gap-0.5 text-left">
					<div className="flex flex-wrap items-center justify-center gap-2">
						<span className="text-lg font-semibold">{user.fullName}</span>
						{user.role === "admin" ? (
							<Badge className="bg-sky-100 text-sky-600 hover:bg-sky-100">
								Quản trị viên
							</Badge>
						) : null}
					</div>
					<span className="text-sm text-muted-foreground">{user.email}</span>
					<span className="text-sm text-muted-foreground">
						Khởi tạo: {formatCreatedAt(user.createdAt)}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
