import { Router } from "express";
import { User } from "../models/User";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/users", async (_req, res) => {
    const users = await User.find()
        .select("-passwordHash -tgSession")
        .sort({ createdAt: -1 });
    res.json({ users });
});

router.patch("/users/:id/plan", async (req, res) => {
    const days = Math.max(Number(req.body.days) || 30, 1);
    const plan: "free" | "pro" = req.body.plan === "free" ? "free" : "pro";
    const planExpiresAt =
        plan === "pro" ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { plan, planExpiresAt },
        { new: true }
    ).select("-passwordHash -tgSession");

    if (!user) {
        res.status(404).json({ error: "Foydalanuvchi topilmadi" });
        return;
    }

    res.json({
        message:
            plan === "pro"
                ? `PRO tarif ${days} kunga faollashtirildi`
                : "Tarif FREE holatiga o'tkazildi",
        user,
    });
});

export default router;