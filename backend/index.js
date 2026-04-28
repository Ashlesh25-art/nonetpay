import dotenv from "dotenv";
import app, { registerRoutes } from "./src/app.js";
import { connectDB } from "./src/db/index.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

connectDB()
	.then(async () => {
		await registerRoutes();
		const server = app.listen(PORT, () => {
			console.log(`Backend listening on http://localhost:${PORT}`);
		});

		server.on("error", (error) => {
			console.error("Server error:", error);
			process.exit(1);
		});
	})
	.catch((error) => {
		console.error("Failed to start server:", error);
		process.exit(1);
	});
