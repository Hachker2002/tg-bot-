import { Router } from "express";
import { Api } from "telegram";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { getAccountDialogs, makeTgClient } from "../services/runner";

const router = Router();
router.use(requireAuth);

interface PendingAuth {
    apiId: number;
    apiHash: string;
    phone: string;
    phoneCodeHash: string;
    sessionString: string;
}

const pendingMap = new Map<string, PendingAuth>();

router.post("/send-code", async (req: AuthRequest, res) => {
    try {
        const { apiId, apiHash, phone } = req.body;
        const numericId = Number(apiId);
        if (!numericId || !apiHash || !phone) {
            res.status(400).json({ error: "apiId, apiHash va phone majburiy" });
            return;
        }

        const client = makeTgClient(numericId, String(apiHash).trim(), "");
        await client.connect();

        const sent = await client.sendCode(
            { apiId: numericId, apiHash: String(apiHash).trim() },
            String(phone).trim()
        );

        const sessionString = client.session.save() as unknown as string;
        await client.disconnect();

        const loginKey = `${req.user!.id}-${Date.now()}`;
        pendingMap.set(loginKey, {
            apiId: numericId,
            apiHash: String(apiHash).trim(),
            phone: String(phone).trim(),
            phoneCodeHash: sent.phoneCodeHash,
            sessionString,
        });

        res.json({ ok: true, loginKey, message: "Kod Telegramga yuborildi" });
    } catch (err: any) {
        res.status(500).json({ error: err?.message || "Kod yuborishda xato" });
    }
});

router.post("/verify-code", async (req: AuthRequest, res) => {
    try {
        const { loginKey, code, password } = req.body;
        const pending = pendingMap.get(loginKey);
        if (!pending) {
            res.status(400).json({ error: "Kod sessiyasi eskirgan, qayta yuboring" });
            return;
        }

        const client = makeTgClient(
            pending.apiId,
            pending.apiHash,
            pending.sessionString
        );
        await client.connect();

        try {
            await client.invoke(
                new Api.auth.SignIn({
                    phoneNumber: pending.phone,
                    phoneCodeHash: pending.phoneCodeHash,
                    phoneCode: String(code).trim(),
                })
            );
        } catch (err: any) {
            if (err?.errorMessage === "SESSION_PASSWORD_NEEDED") {
                if (!password) {
                    await client.disconnect();
                    res.status(401).json({
                        needPassword: true,
                        error: "2FA parolni kiriting",
                    });
                    return;
                }
                const srp = await client.invoke(new Api.account.GetPassword());
                const { computeCheck } = await import("telegram/Password");
                const check = await computeCheck(srp, String(password));
                await client.invoke(new Api.auth.CheckPassword({ password: check }));
            } else {
                await client.disconnect();
                throw err;
            }
        }

        const finalSession = client.session.save() as unknown as string;
        await client.disconnect();
        pendingMap.delete(loginKey);

        await User.findByIdAndUpdate(req.user!.id, {
            tgApiId: pending.apiId,
            tgApiHash: pending.apiHash,
            tgSession: finalSession,
        });

        res.json({ ok: true, message: "Telegram akkaunt muvaffaqiyatli ulandi" });
    } catch (err: any) {
        res.status(400).json({ error: err?.message || "Tasdiqlashda xato" });
    }
});

router.post("/dialogs", async (req: AuthRequest, res) => {
    try {
        const dbUser = await User.findById(req.user!.id);
        const apiId = Number(req.body.apiId || dbUser?.tgApiId);
        const apiHash = String(req.body.apiHash || dbUser?.tgApiHash || "").trim();
        const sessionString = String(dbUser?.tgSession || "");

        if (!apiId || !apiHash || !sessionString) {
            res.status(400).json({
                error: "Avval API ID, API Hash kiriting va Telegram akkauntni ulang",
            });
            return;
        }

        const data = await getAccountDialogs({ apiId, apiHash, sessionString });
        res.json({ ok: true, ...data });
    } catch (err: any) {
        res.status(500).json({ error: err?.message || "Dialoglarni olishda xato" });
    }
});

export default router;