import { Router } from "express";
import path from "path";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { uploadImage } from "../config/upload";
import { Task } from "../models/Task";
import { startTaskRunner, stopTaskRunner } from "../services/runner";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
    const tasks = await Task.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json({ tasks });
});

router.post(
    "/",
    uploadImage.single("image"),
    async (req: AuthRequest, res) => {
        try {
            const { groupId, message, altMessage, intervalSec } = req.body;
            if (!groupId || !message) {
                res.status(400).json({ error: "groupId va message majburiy" });
                return;
            }

            const isPro = req.user!.plan === "pro";
            const activeCount = await Task.countDocuments({
                userId: req.user!.id,
                isActive: true,
            });

            if (!isPro && activeCount >= 1) {
                res.status(403).json({
                    error: "FREE tarifda faqat 1 ta faol vazifa ishlaydi. PRO tarifga o'ting.",
                });
                return;
            }

            const minInterval = isPro ? 60 : 180;
            const safeInterval = Math.max(Number(intervalSec) || minInterval, minInterval);

            const task = await Task.create({
                userId: req.user!.id,
                groupId: String(groupId),
                message: String(message),
                altMessage: String(altMessage || ""),
                imagePath: req.file ? path.join("uploads", req.file.filename) : null,
                intervalSec: safeInterval,
                isActive: true,
            });

            startTaskRunner(task);
            res.status(201).json({ task });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
);

router.post("/:id/stop", async (req: AuthRequest, res) => {
    const task = await Task.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!.id },
        { isActive: false },
        { new: true }
    );
    if (!task) {
        res.status(404).json({ error: "Vazifa topilmadi" });
        return;
    }
    stopTaskRunner(String(task._id));
    res.json({ ok: true, task });
});

export default router;