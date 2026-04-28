import express from "express";
import { getDB } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/transactions/user", authMiddleware, async (req, res) => {
	try {
		const db = getDB();
		const user = await db.collection("users").findOne({ userId: req.user.userId });
		if (!user) return res.status(404).json({ error: "User not found" });

		const history = Array.isArray(user.balanceHistory) ? user.balanceHistory : [];
		const transactions = [];

		history.forEach((h) => {
			if (h.type === "add") {
				transactions.push({
					id: `bal_${h.timestamp}`,
					type: "credit",
					category: "wallet_load",
					amount: h.amount,
					description: "Added to wallet",
					timestamp: h.timestamp,
					balance: h.newBalance,
				});
			} else if (h.type === "refund") {
				transactions.push({
					id: `refund_${h.voucherId || h.timestamp}`,
					type: "credit",
					category: "voucher_refund",
					amount: h.amount,
					description: "Voucher expired - refund",
					timestamp: h.timestamp,
					balance: h.newBalance,
					voucherId: h.voucherId || null,
				});
			}
		});

		const payments = await db.collection("vouchers").find({ issuedTo: user.userId }).sort({ createdAt: -1 }).toArray();
		payments.forEach((p) => {
			transactions.push({
				id: p.voucherId,
				type: "debit",
				category: "payment",
				amount: p.amount,
				description: `Paid to ${p.merchantName || p.merchantId}`,
				merchantId: p.merchantId,
				timestamp: p.createdAt,
				status: p.status,
			});
		});

		transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

		return res.json({ success: true, transactions, count: transactions.length });
	} catch (error) {
		console.error("Get user transactions error:", error);
		return res.status(500).json({ error: "Failed to get transactions" });
	}
});

router.get("/transactions/merchant", authMiddleware, async (req, res) => {
	try {
		const merchantId = req.user.merchantId || req.user.userId;
		const db = getDB();
		const payments = await db.collection("vouchers").find({ merchantId }).sort({ createdAt: -1 }).toArray();

		const transactions = payments.map((p) => ({
			id: p.voucherId,
			type: "credit",
			category: "payment_received",
			amount: p.amount,
			description: `Payment from ${p.payerName || p.payerId || "Customer"}`,
			payerId: p.payerId,
			payerName: p.payerName,
			timestamp: p.createdAt || p.syncedAt,
			status: p.status,
		}));

		const totalReceived = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
		return res.json({ success: true, transactions, count: transactions.length, totalReceived });
	} catch (error) {
		console.error("Get merchant transactions error:", error);
		return res.status(500).json({ error: "Failed to get transactions" });
	}
});

export default router;
