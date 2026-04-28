export function errorHandler(err, req, res, next) {
	const status = err.statusCode || err.status || 500;
	const message = err.message || "Internal server error";

	console.error("Request error:", {
		method: req.method,
		url: req.originalUrl,
		status,
		message,
	});

	res.status(status).json({ error: message });
}
