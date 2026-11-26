import { Router } from "express";
import { User } from "../models/User";
import {
    hashPassword,
    verifyPassword,
    signToken,
    requireAuth,
    AuthRequest,
} from "../middleware/auth";

const router = Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ error: "Ism, email va parol majburiy" });
            return;
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const exists = await User.findOne({ email: normalizedEmail });
        if (exists) {
            res.status(400).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
            return;
        }

        const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
        const role: "user" | "admin" =
            adminEmail && normalizedEmail === adminEmail ? "admin" : "user";

        const user = await User.create({
            name: String(name).trim(),
            email: normalizedEmail,
            passwordHash: hashPassword(String(password)),
            role,
            plan: "free",
        });

        const token = signToken({ id: String(user._id), role: user.role });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
                planExpiresAt: user.planExpiresAt,
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: String(email).toLowerCase().trim() });
        if (!user || !verifyPassword(String(password || ""), user.passwordHash)) {
            res.status(401).json({ error: "Email yoki parol noto'g'ri" });
            return;
        }

        const token = signToken({ id: String(user._id), role: user.role });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
                planExpiresAt: user.planExpiresAt,
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
    const user = await User.findById(req.user!.id).select("-passwordHash -tgSession");
    res.json({ user });
});

export default router;