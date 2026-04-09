import { createBrowserRouter } from "react-router";
import { userRoutes } from "@user/routes";
import { adminRoutes } from "@admin/routes";

export const router = createBrowserRouter([...userRoutes, ...adminRoutes]);
