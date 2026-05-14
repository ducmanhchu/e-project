import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ConversationListQueryParams } from "@shared/types/conversation";
import { fetchConversationList } from "@shared/api/conversation";
import { useFetchMe } from "@shared/hooks/use-fetch-me";
import { baseFilterSections, statusFilterSection } from "@shared/lib/utils";

import { Separator } from "@shared/components/ui/separator";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@shared/components/ui/pagination";

import { FilterSection } from "@user/features/writing/components/filter-section";
import { ConversationCard } from "@user/features/speaking/methods/conversation/components/card";

const ITEMS_PER_PAGE = 12;

function extractFilterValues(
	selected: Record<string, boolean>,
	sectionId: string,
): string[] {
	const prefix = `${sectionId}:`;
	return Object.entries(selected)
		.filter(([key, checked]) => checked && key.startsWith(prefix))
		.map(([key]) => key.slice(prefix.length));
}

function buildQueryParams(
	selected: Record<string, boolean>,
	page: number,
): ConversationListQueryParams {
	const params: ConversationListQueryParams = {
		page,
		limit: ITEMS_PER_PAGE,
	};

	const statuses = extractFilterValues(selected, "status");
	if (statuses.length > 0) params.status = statuses.join(",");

	const levels = extractFilterValues(selected, "level");
	if (levels.length > 0) params.level = levels.join(",");

	const topics = extractFilterValues(selected, "topic");
	if (topics.length > 0) params.topic = topics.join(",");

	return params;
}

function generatePageNumbers(
	current: number,
	total: number,
): (number | "ellipsis")[] {
	if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

	const pages: (number | "ellipsis")[] = [1];

	if (current > 3) pages.push("ellipsis");

	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);
	for (let i = start; i <= end; i++) pages.push(i);

	if (current < total - 2) pages.push("ellipsis");

	pages.push(total);
	return pages;
}

export function ConversationList() {
	const [selected, setSelected] = useState<Record<string, boolean>>({});
	const [page, setPage] = useState(1);

	const { data: me } = useFetchMe();
	const isLoggedIn = !!me;

	const filterSections = useMemo(
		() =>
			isLoggedIn
				? [statusFilterSection, ...baseFilterSections]
				: baseFilterSections,
		[isLoggedIn],
	);

	const queryParams = useMemo(
		() => buildQueryParams(selected, page),
		[selected, page],
	);

	const { data, isLoading, isError } = useQuery({
		queryKey: ["conversation", "list", queryParams],
		queryFn: () => fetchConversationList(queryParams),
		placeholderData: keepPreviousData,
	});

	const items = data?.data ?? [];

	const pagination = data?.pagination;
	const pageNumbers = useMemo(
		() => (pagination ? generatePageNumbers(page, pagination.totalPages) : []),
		[page, pagination],
	);

	const onCheckedChange = useCallback(
		(compositeId: string, checked: boolean) => {
			setSelected((prev) => ({ ...prev, [compositeId]: checked }));
			setPage(1);
		},
		[],
	);

	return (
		<div className="grid grid-cols-1 gap-10 lg:gap-0 lg:grid-cols-3">
			<div className="flex w-full max-w-xs flex-col gap-4">
				<h2 className="font-heading text-base text-foreground">Bộ lọc</h2>
				<Separator />
				<div className="flex flex-col gap-6">
					{filterSections.map((section) => (
						<FilterSection
							key={section.id}
							sectionId={section.id}
							label={section.label}
							options={section.options}
							selected={selected}
							onCheckedChange={onCheckedChange}
						/>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-10 md:col-span-2">
				<div className="flex flex-col gap-4">
					<h1 className="font-extrabold text-4xl">Hội thoại</h1>
					<p className="text-base">
						Tham gia vào các tình huống giao tiếp mô phỏng thực tế cùng AI để
						rèn luyện phản xạ tự nhiên và sự trôi chảy.
					</p>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-52 rounded-xl" />
						))}
					</div>
				) : isError ? (
					<p className="text-center text-muted-foreground">
						Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
					</p>
				) : items.length === 0 ? (
					<p className="text-center text-muted-foreground">
						Không tìm thấy bài tập nào phù hợp.
					</p>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{items.map((card) => (
							<ConversationCard key={card.id} card={card} />
						))}
					</div>
				)}

				{pagination && pagination.totalPages > 1 && (
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									aria-disabled={page === 1}
									className={
										page === 1
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>

							{pageNumbers.map((p, i) =>
								p === "ellipsis" ? (
									<PaginationItem key={`ellipsis-${i}`}>
										<PaginationEllipsis />
									</PaginationItem>
								) : (
									<PaginationItem key={p}>
										<PaginationLink
											isActive={p === page}
											onClick={() => setPage(p)}
											className="cursor-pointer"
										>
											{p}
										</PaginationLink>
									</PaginationItem>
								),
							)}

							<PaginationItem>
								<PaginationNext
									onClick={() =>
										setPage((p) => Math.min(pagination.totalPages, p + 1))
									}
									aria-disabled={page === pagination.totalPages}
									className={
										page === pagination.totalPages
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				)}
			</div>
		</div>
	);
}
