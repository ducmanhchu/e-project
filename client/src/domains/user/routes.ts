import type { RouteObject } from "react-router";

import { UserLayout } from "@user/shell/user-layout";
import { Home } from "@user/features/home/pages";

import { Login } from "@user/features/auth/pages/login";
import { Register } from "@user/features/auth/pages/register";
import { ChangePassword } from "@user/features/auth/pages/change-password";
import { VerifyEmail } from "@user/features/auth/pages/verify-email";
import { ForgotPassword } from "@user/features/auth/pages/forgot-password";
import { ResetPassword } from "@user/features/auth/pages/reset-password";

import { WritingLayout } from "@user/features/writing/layout/writing-layout";
import { WritingMethod } from "@user/features/writing/pages";
import { ReverseTranslateList } from "@user/features/writing/methods/reverse-translate/pages/list";
import { ReverseTranslateExercise } from "@user/features/writing/methods/reverse-translate/pages/exercise";
import { SeeAndWriteList } from "@user/features/writing/methods/see-and-write/pages/list";
import { SeeAndWriteExercise } from "@user/features/writing/methods/see-and-write/pages/exercise";
import { ParaphraseList } from "@user/features/writing/methods/paraphrase/pages/list";
import { ParaphraseExercise } from "@user/features/writing/methods/paraphrase/pages/exercise";

import { SpeakingLayout } from "@user/features/speaking/layout/speaking-layout";
import { SpeakingMethod } from "@user/features/speaking/pages";
import { ConversationList } from "@user/features/speaking/methods/conversation/pages/list";
import { ConversationExercise } from "@user/features/speaking/methods/conversation/pages/exercise";

import { Vocabulary } from "@user/features/vocabulary/pages";

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
				Component: ChangePassword,
				loader: requireAuthLoader,
			},
			{
				path: "writing",
				Component: WritingLayout,
				children: [
					{
						index: true,
						Component: WritingMethod,
					},
					{
						path: "reverse-translate",
						Component: ReverseTranslateList,
					},
					{
						path: "see-and-write",
						Component: SeeAndWriteList,
					},
					{
						path: "paraphrase",
						Component: ParaphraseList,
					},
				],
			},
			{
				path: "speaking",
				Component: SpeakingLayout,
				children: [
					{
						index: true,
						Component: SpeakingMethod,
					},
					{
						path: "conversation",
						Component: ConversationList,
					},
				],
			},
			{
				path: "vocabulary",
				Component: Vocabulary,
				loader: requireAuthLoader,
			},
		],
	},
	{
		path: "/writing/reverse-translate/:id",
		Component: ReverseTranslateExercise,
		loader: requireAuthLoader,
	},
	{
		path: "/writing/see-and-write/:id",
		Component: SeeAndWriteExercise,
		loader: requireAuthLoader,
	},
	{
		path: "/writing/paraphrase/:id",
		Component: ParaphraseExercise,
		loader: requireAuthLoader,
	},
	{
		path: "/speaking/conversation/:id",
		Component: ConversationExercise,
		loader: requireAuthLoader,
	},
	{
		path: "/login",
		Component: Login,
	},
	{
		path: "/register",
		Component: Register,
	},
	{
		path: "/verify-email",
		Component: VerifyEmail,
	},
	{
		path: "/forgot-password",
		Component: ForgotPassword,
	},
	{
		path: "/reset-password",
		Component: ResetPassword,
	},
];
