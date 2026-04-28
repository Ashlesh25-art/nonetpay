import crypto from "crypto";
import pkg from "elliptic";

const { ec: EC } = pkg;
const ec = new EC("secp256k1");

export function verifyECDSA(payload, signatureHex, publicKeyHex) {
	try {
		if (!payload || !signatureHex || !publicKeyHex) return false;
		const payloadStr = JSON.stringify(payload);
		const msgHashHex = crypto.createHash("sha256").update(payloadStr).digest("hex");
		const key = ec.keyFromPublic(publicKeyHex, "hex");
		return key.verify(msgHashHex, signatureHex);
	} catch {
		return false;
	}
}

export function computeHMAC(payload, secret) {
	const key = secret || process.env.HMAC_SECRET || "OFFLINE_DEMO_SECRET_123456";
	const payloadStr = JSON.stringify(payload);
	return crypto.createHmac("sha256", key).update(payloadStr).digest("hex");
}
