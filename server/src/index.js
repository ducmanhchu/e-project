import "dotenv/config";
import express from "express";
import cors from "cors";
import { CONNECT_DB } from "@server/config/mongodb";
import { env } from "@server/config/environment";
import apiRouter from "@server/routes/api";
import adminRouter from "@server/routes/admin";
import cookieParser from "cookie-parser";
import { errorHandler } from "@server/middlewares/errorHandler";
const PORT = env.LOCAL_PORT || 8017;
const HOST = env.LOCAL_HOST || "localhost";

const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// router
app.use("/api/admin", adminRouter);
app.use("/api", apiRouter);

// Error handler — must be after all routes
app.use(errorHandler);

CONNECT_DB().then(() => {
	app.listen(PORT, HOST, () => {
		console.log(`Server is running at http://${HOST}:${PORT}`);
	});
});
