import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "OFFLINE_DEMO_SECRET_123456";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";

export async function hashPassword(password) {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
	return bcrypt.compare(password, hash);
}

export function generateToken(payload) {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

export function verifyToken(token) {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch {
		return null;
	}
}

export function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ error: "No token provided" });
	}

	const decoded = verifyToken(authHeader.substring(7));
	if (!decoded) {
		return res.status(401).json({ error: "Invalid or expired token" });
	}

	req.user = decoded;
	next();
}

export function optionalAuthMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith("Bearer ")) {
		const decoded = verifyToken(authHeader.substring(7));
		if (decoded) req.user = decoded;
	}
	next();
}
