import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: "user" | "admin";
        plan: "free" | "pro";
    };
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(key, "hex");
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
}

export function signToken(payload: { id: string; role: "user" | "admin" }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        if (!token) {
            res.status(401).json({ error: "Token topilmadi" });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        const dbUser = await User.findById(decoded.id);
        if (!dbUser) {
            res.status(401).json({ error: "Foydalanuvchi topilmadi" });
            return;
        }

        let effectivePlan: "free" | "pro" = dbUser.plan;
        if (
            dbUser.plan === "pro" &&
            dbUser.planExpiresAt &&
            new Date(dbUser.planExpiresAt).getTime() < Date.now()
        ) {
            dbUser.plan = "free";
            dbUser.planExpiresAt = null;
            await dbUser.save();
            effectivePlan = "free";
        }

        req.user = {
            id: String(dbUser._id),
            role: dbUser.role,
            plan: effectivePlan,
        };
        next();
    } catch {
        res.status(401).json({ error: "Token yaroqsiz" });
    }
}

export function requireAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void {
    if (req.user?.role !== "admin") {
        res.status(403).json({ error: "Faqat admin kira oladi" });
        return;
    }
    next();
}