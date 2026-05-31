import "dotenv/config";
import express from "express";
import cors from "cors";
import { CONNECT_DB } from "@server/config/mongodb";
import { env } from "@server/config/environment";
import apiRouter from "@server/routes/api";
import adminRouter from "@server/routes/admin";
import cookieParser from "cookie-parser";
import { errorHandler } from "@server/middlewares/errorHandler";

// Ưu tiên đọc cổng tự động từ DigitalOcean (process.env.PORT), nếu ở Local thì dùng LOCAL_PORT hoặc 8017
const PORT = process.env.PORT || env.LOCAL_PORT || 8017;

const app = express();

// Middleware
// Tự động nhận diện link Vercel khi trên mây, và dùng localhost khi chạy ở local
app.use(
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:5173",
		credentials: true,
	}),
);

// Chỉ dùng cấu hình mặc định do server chỉ nhận chuỗi JSON kết quả (không nhận audio)
app.use(express.json());
app.use(cookieParser());

// router
app.use("/api/admin", adminRouter);
app.use("/api", apiRouter);

// Error handler — must be after all routes
app.use(errorHandler);

CONNECT_DB().then(() => {
	// Loại bỏ biến HOST để Express tự động lắng nghe mọi IP (0.0.0.0) trên đám mây
	app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
});
