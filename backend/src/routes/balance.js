import express from "express";
import { getDB } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/balance", authMiddleware, async (req, res) => {
	try {
		const db = getDB();
		const user = await db.collection("users").findOne({ userId: req.user.userId });
		if (!user) return res.status(404).json({ error: "User not found" });

		return res.json({
			success: true,
			balance: user.balance || 0,
			userId: user.userId,
			name: user.name,
			phone: user.phone,
		});
	} catch (error) {
		console.error("Get balance error:", error);
		return res.status(500).json({ error: "Failed to get balance" });
	}
});

router.post("/balance/add", authMiddleware, async (req, res) => {
	try {
		const { amount } = req.body || {};
		if (!amount || typeof amount !== "number" || amount <= 0) {
			return res.status(400).json({ error: "Invalid amount" });
		}
		if (amount > 1000) {
			return res.status(400).json({ error: "Maximum load amount is Rs 1000" });
		}

		const db = getDB();
		const users = db.collection("users");
		const user = await users.findOne({ userId: req.user.userId });
		if (!user) return res.status(404).json({ error: "User not found" });

		const previousBalance = user.balance || 0;
		const newBalance = previousBalance + amount;

		await users.updateOne(
			{ userId: req.user.userId },
			{
				$set: { balance: newBalance },
				$push: {
					balanceHistory: {
						type: "add",
						amount,
						timestamp: new Date().toISOString(),
						previousBalance,
						newBalance,
					},
				},
			}
		);

		return res.json({
			success: true,
			balance: newBalance,
			amount,
			message: "Balance added successfully",
		});
	} catch (error) {
		console.error("Add balance error:", error);
		return res.status(500).json({ error: "Failed to add balance" });
	}
});

router.post("/balance/deduct", authMiddleware, async (req, res) => {
	try {
		const { amount, merchantId, voucherId } = req.body || {};
		if (!amount || typeof amount !== "number" || amount <= 0) {
			return res.status(400).json({ error: "Invalid amount" });
		}

		const db = getDB();
		const users = db.collection("users");
		const user = await users.findOne({ userId: req.user.userId });
		if (!user) return res.status(404).json({ error: "User not found" });

		const currentBalance = user.balance || 0;
		const history = Array.isArray(user.balanceHistory) ? user.balanceHistory : [];

		if (voucherId) {
			const already = history.some((h) => h.voucherId === voucherId && h.type === "payment");
			if (already) {
				return res.json({
					success: true,
					balance: currentBalance,
					amount,
					message: "Already deducted",
				});
			}
		}

		if (currentBalance < amount) {
			return res.status(400).json({
				error: "Insufficient balance",
				required: amount,
				available: currentBalance,
			});
		}

		const newBalance = currentBalance - amount;
		await users.updateOne(
			{ userId: req.user.userId },
			{
				$set: { balance: newBalance },
				$push: {
					balanceHistory: {
						type: "payment",
						amount,
						timestamp: new Date().toISOString(),
						previousBalance: currentBalance,
						newBalance,
						merchantId,
						voucherId,
					},
				},
			}
		);

		return res.json({
			success: true,
			balance: newBalance,
			amount,
			message: "Payment processed",
		});
	} catch (error) {
		console.error("Deduct balance error:", error);
		return res.status(500).json({ error: "Failed to process payment" });
	}
});

router.post("/register-key", async (req, res) => {
	try {
		const { userId, publicKeyHex } = req.body || {};
		if (!userId || !publicKeyHex) {
			return res.status(400).json({ error: "Invalid body" });
		}

		const db = getDB();
		await db.collection("users").updateOne(
			{ userId },
			{ $set: { publicKeyHex, registeredAt: new Date().toISOString() } },
			{ upsert: true }
		);

		return res.json({ ok: true });
	} catch (error) {
		console.error("Register key error:", error);
		return res.status(500).json({ error: "Failed to register key" });
	}
});

export default router;
