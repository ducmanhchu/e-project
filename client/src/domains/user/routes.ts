import type { RouteObject } from "react-router";

import { UserLayout } from "@user/shell/user-layout";
import { Home } from "@user/features/home/pages";
import { lazyRoute } from "@shared/lib/lazy-route";
import { requireAuthLoader } from "@shared/lib/auth-loaders";

export const userRoutes: RouteObject[] = [
	{
		path: "/",
		Component: UserLayout,
		children: [
			{
				index: true,
				Component: Home,
			},
			{
				path: "change-password",
				loader: requireAuthLoader,
				...lazyRoute(
					() => import("@user/features/auth/pages/change-password"),
					"ChangePassword",
				),
			},
			{
				path: "my-transactions",
				loader: requireAuthLoader,
				...lazyRoute(
					() => import("@user/features/wallet/pages/my-transactions"),
					"MyTransactions",
				),
			},
			{
				path: "profile",
				loader: requireAuthLoader,
				...lazyRoute(() => import("@user/features/profile/pages"), "Profile"),
			},
			{
				path: "writing",
				...lazyRoute(
					() => import("@user/features/writing/layout/writing-layout"),
					"WritingLayout",
				),
				children: [
					{
						index: true,
						...lazyRoute(
							() => import("@user/features/writing/pages"),
							"WritingMethod",
						),
					},
					{
						path: "reverse-translate",
						...lazyRoute(
							() =>
								import("@user/features/writing/methods/reverse-translate/pages/list"),
							"ReverseTranslateList",
						),
					},
					{
						path: "see-and-write",
						...lazyRoute(
							() =>
								import("@user/features/writing/methods/see-and-write/pages/list"),
							"SeeAndWriteList",
						),
					},
					{
						path: "paraphrase",
						...lazyRoute(
							() =>
								import("@user/features/writing/methods/paraphrase/pages/list"),
							"ParaphraseList",
						),
					},
				],
			},
			{
				path: "speaking",
				...lazyRoute(
					() => import("@user/features/speaking/layout/speaking-layout"),
					"SpeakingLayout",
				),
				children: [
					{
						index: true,
						...lazyRoute(
							() => import("@user/features/speaking/pages"),
							"SpeakingMethod",
						),
					},
					{
						path: "conversation",
						...lazyRoute(
							() =>
								import("@user/features/speaking/methods/conversation/pages/list"),
							"ConversationList",
						),
					},
				],
			},
			{
				path: "vocabulary",
				loader: requireAuthLoader,
				...lazyRoute(
					() => import("@user/features/vocabulary/layout/vocabulary-layout"),
					"VocabularyLayout",
				),
				children: [
					{
						index: true,
						...lazyRoute(
							() => import("@user/features/vocabulary/pages"),
							"Vocabulary",
						),
					},
					{
						path: "folder/:folderId",
						...lazyRoute(
							() => import("@user/features/vocabulary/pages/folder"),
							"VocabularyFolder",
						),
					},
					{
						path: "deck/:deckId",
						...lazyRoute(
							() => import("@user/features/vocabulary/pages/deck"),
							"VocabularyDeck",
						),
					},
				],
			},
		],
	},
	{
		path: "/writing/reverse-translate/:id",
		loader: requireAuthLoader,
		...lazyRoute(
			() =>
				import("@user/features/writing/methods/reverse-translate/pages/exercise"),
			"ReverseTranslateExercise",
		),
	},
	{
		path: "/writing/see-and-write/:id",
		loader: requireAuthLoader,
		...lazyRoute(
			() =>
				import("@user/features/writing/methods/see-and-write/pages/exercise"),
			"SeeAndWriteExercise",
		),
	},
	{
		path: "/writing/paraphrase/:id",
		loader: requireAuthLoader,
		...lazyRoute(
			() => import("@user/features/writing/methods/paraphrase/pages/exercise"),
			"ParaphraseExercise",
		),
	},
	{
		path: "/speaking/conversation/:id",
		loader: requireAuthLoader,
		...lazyRoute(
			() =>
				import("@user/features/speaking/methods/conversation/pages/exercise"),
			"ConversationExercise",
		),
	},
	{
		path: "/vocabulary/test",
		loader: requireAuthLoader,
		...lazyRoute(
			() => import("@user/features/vocabulary/pages/test"),
			"VocabularyTest",
		),
	},
	{
		path: "/login",
		...lazyRoute(() => import("@user/features/auth/pages/login"), "Login"),
	},
	{
		path: "/register",
		...lazyRoute(
			() => import("@user/features/auth/pages/register"),
			"Register",
		),
	},
	{
		path: "/verify-email",
		...lazyRoute(
			() => import("@user/features/auth/pages/verify-email"),
			"VerifyEmail",
		),
	},
	{
		path: "/forgot-password",
		...lazyRoute(
			() => import("@user/features/auth/pages/forgot-password"),
			"ForgotPassword",
		),
	},
	{
		path: "/reset-password",
		...lazyRoute(
			() => import("@user/features/auth/pages/reset-password"),
			"ResetPassword",
		),
	},
];
