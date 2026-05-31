import { lazy, Suspense, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";

import { ChartSkeleton } from "@shared/components/chart-skeleton";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";

import { VocabTestTakingPanel } from "@user/features/vocabulary/components/test/test-taking-panel";
import { VocabTestSidebar } from "@user/features/vocabulary/components/test/test-sidebar";

const VocabTestResult = lazy(() =>
	import("@user/features/vocabulary/components/test/test-result").then((m) => ({
		default: m.VocabTestResult,
	})),
);
import { VocabTestTopbar } from "@user/features/vocabulary/components/test/test-topbar";
import { useVocabTest } from "@user/features/vocabulary/hooks/use-vocab-test";
import { VOCAB_ROUTES } from "@user/features/vocabulary/utils/constants";

/**
 * Trang bài kiểm tra từ vựng full-screen (không header/footer).
 * @returns Giao diện làm bài và xem kết quả
 */
export function VocabularyTest() {
	const navigate = useNavigate();
	const {
		config,
		questions,
		answers,
		phase,
		summary,
		results,
		isLoading,
		isError,
		sessionId,
		setActiveIndex,
		registerQuestionRef,
		setAnswer,
		clearAnswer,
		submitTest,
		retryWrong,
	} = useVocabTest();

	const answeredCount = useMemo(() => answers.size, [answers]);

	useEffect(() => {
		if (!config && !isLoading) {
			navigate(VOCAB_ROUTES.root, { replace: true });
		}
	}, [config, isLoading, navigate]);

	const hasWrongQuestions = useMemo(
		() =>
			results.some(
				(item) => item.status === "incorrect" || item.status === "skipped",
			),
		[results],
	);

	const handleClose = useCallback(() => {
		if (config?.deckId) {
			navigate(VOCAB_ROUTES.deck(config.deckId));
			return;
		}
		navigate(VOCAB_ROUTES.root);
	}, [config, navigate]);

	if (!config) {
		return null;
	}

	if (isLoading) {
		return (
			<div className="flex min-h-dvh flex-col p-6">
				<Skeleton className="mb-4 h-14 w-full rounded-lg" />
				<Skeleton className="h-64 w-full max-w-3xl self-center rounded-2xl" />
			</div>
		);
	}

	if (isError || questions.length === 0) {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
				<p className="text-muted-foreground">
					Không thể tải bài kiểm tra. Học phần có thể không có đủ thẻ.
				</p>
				<Button type="button" variant="link" onClick={handleClose}>
					Quay lại học phần
				</Button>
			</div>
		);
	}

	const isResult = phase === "result";

	return (
		<main className="flex w-full flex-col">
			<div className="sticky top-0 z-10">
				<VocabTestTopbar
					answeredCount={isResult ? (summary?.correct ?? 0) : answeredCount}
					totalCount={questions.length}
					accuracyPercent={summary?.accuracyPercent}
					onClose={handleClose}
					isResult={isResult}
				/>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-6">
				<div className="md:col-span-1 p-4">
					<div className="sticky top-16 self-start">
						<VocabTestSidebar
							questions={questions}
							results={isResult ? results : undefined}
							onSelectQuestion={setActiveIndex}
							isResult={isResult}
						/>
					</div>
				</div>
				<div className="md:col-span-5 p-4">
					{isResult && summary ? (
						<Suspense fallback={<ChartSkeleton className="max-w-3xl" />}>
							<VocabTestResult
								summary={summary}
								results={results}
								onRetryWrong={retryWrong}
								onBackToDeck={handleClose}
								hasWrongQuestions={hasWrongQuestions}
								registerQuestionRef={registerQuestionRef}
							/>
						</Suspense>
					) : (
						<VocabTestTakingPanel
							key={sessionId}
							questions={questions}
							answers={answers}
							registerQuestionRef={registerQuestionRef}
							setAnswer={setAnswer}
							clearAnswer={clearAnswer}
							onSubmit={submitTest}
						/>
					)}
				</div>
			</div>
		</main>
	);
}
