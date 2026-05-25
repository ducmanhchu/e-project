import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/lib/utils";

export type ErrorPageProps = {
	code: string;
	message: string;
	className?: string;
};

export const NOT_FOUND_PAGE = {
	code: "404",
	message: "Trang không tồn tại.",
} as const satisfies Omit<ErrorPageProps, "className">;

export const UNKNOWN_ERROR_PAGE = {
	code: "Lỗi",
	message: "Lỗi không xác định.",
} as const satisfies Omit<ErrorPageProps, "className">;

export function ErrorPage({ code, message, className }: ErrorPageProps) {
	return (
		<div
			className={cn(
				"bg-background text-foreground flex min-h-svh w-full items-center justify-center",
				className,
			)}
		>
			<div className="flex items-center gap-5 px-4 sm:gap-6">
				<h1 className="text-2xl font-bold leading-none tracking-tight sm:text-3xl">
					{code}
				</h1>
				<Separator orientation="vertical" className="bg-border h-10 sm:h-12" />
				<p className="text-foreground text-lg">{message}</p>
			</div>
		</div>
	);
}
