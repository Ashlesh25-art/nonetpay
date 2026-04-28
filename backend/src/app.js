import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
	cors({
		origin: true,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	})
);

app.use(express.json());

const createEmptyRouter = () => express.Router();

export async function registerRoutes() {
	const authModule = await import("./routes/auth.js").catch(() => ({}));
	const balanceModule = await import("./routes/balance.js").catch(() => ({}));
	const vouchersModule = await import("./routes/vouchers.js").catch(() => ({}));
	const merchantModule = await import("./routes/merchant.js").catch(() => ({}));
	const transactionsModule = await import("./routes/transactions.js").catch(() => ({}));
	const adminModule = await import("./routes/admin.js").catch(() => ({}));

	const authRoutes = authModule.default || createEmptyRouter();
	const balanceRoutes = balanceModule.default || createEmptyRouter();
	const vouchersRoutes = vouchersModule.default || createEmptyRouter();
	const merchantRoutes = merchantModule.default || createEmptyRouter();
	const transactionsRoutes = transactionsModule.default || createEmptyRouter();
	const adminRoutes = adminModule.default || createEmptyRouter();

	app.use("/api", authRoutes);
	app.use("/api", balanceRoutes);
	app.use("/api", vouchersRoutes);
	app.use("/api", merchantRoutes);
	app.use("/api", transactionsRoutes);
	app.use("/", adminRoutes);

	app.use(errorHandler);
}

export default app;
