import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";

import "./index.css";
import { router } from "./router.ts";
import { queryClient } from "@/shared/lib/query-client";
import { Toaster } from "@shared/components/ui/sonner";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
				<Toaster />
			</QueryClientProvider>
		</GoogleOAuthProvider>
	</StrictMode>,
);
