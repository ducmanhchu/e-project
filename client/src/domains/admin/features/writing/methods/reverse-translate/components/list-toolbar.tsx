import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

import { baseFilterSections } from "@shared/lib/utils";
import { GooeyInput } from "@shared/components/ui/gooey-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import { Button } from "@shared/components/ui/button";

import { contentTypeFilterOptions } from "@admin/features/writing/methods/reverse-translate/components/form-options";

const RT_ALL_FILTER = "all";

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

type RTListToolbarProps = {
	searchInput: string;
	onSearchChange: (value: string) => void;
	levelFilter: string;
	topicFilter: string;
	contentTypeFilter: string;
	selectedCount: number;
	onAddClick: () => void;
	onBulkDeleteClick: () => void;
	onLevelFilterChange: (value: string) => void;
	onTopicFilterChange: (value: string) => void;
	onContentTypeFilterChange: (value: string) => void;
};

export const RTListToolbar = memo(function RTListToolbar({
	searchInput,
	onSearchChange,
	levelFilter,
	topicFilter,
	contentTypeFilter,
	selectedCount,
	onAddClick,
	onBulkDeleteClick,
	onLevelFilterChange,
	onTopicFilterChange,
	onContentTypeFilterChange,
}: RTListToolbarProps) {
	return (
		<div className="flex flex-wrap justify-between items-center gap-3">
			<div className="flex items-center gap-3">
				<Button type="button" variant="blackHover" onClick={onAddClick}>
					<HugeiconsIcon icon={Add01Icon} />
					Thêm
				</Button>

				<GooeyInput
					collapsedWidth={150}
					expandedWidth={250}
					placeholder="Tìm kiếm"
					value={searchInput}
					onValueChange={onSearchChange}
					theme="light"
				/>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				{selectedCount > 0 ? (
					<div className="flex items-center gap-3">
						<p className="text-sm text-muted-foreground">
							Đã chọn {selectedCount} mục
						</p>
						<Button
							type="button"
							variant="destructive"
							onClick={onBulkDeleteClick}
						>
							<HugeiconsIcon icon={Delete01Icon} />
							Xóa
						</Button>
					</div>
				) : null}

				<Select value={levelFilter} onValueChange={onLevelFilterChange}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder={levelSection.label} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={RT_ALL_FILTER}>Tất cả cấp độ</SelectItem>
						{levelSection.options.map((option) => (
							<SelectItem key={option.id} value={option.id}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={topicFilter} onValueChange={onTopicFilterChange}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder={topicSection.label} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={RT_ALL_FILTER}>Tất cả chủ đề</SelectItem>
						{topicSection.options.map((option) => (
							<SelectItem key={option.id} value={option.id}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={contentTypeFilter}
					onValueChange={onContentTypeFilterChange}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Loại bài" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={RT_ALL_FILTER}>Tất cả loại bài</SelectItem>
						{contentTypeFilterOptions.map((option) => (
							<SelectItem key={option.id} value={option.id}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
});
