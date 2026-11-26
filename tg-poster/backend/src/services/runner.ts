import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Task, ITask } from "../models/Task";
import { User } from "../models/User";

const activeTimers = new Map<string, NodeJS.Timeout>();

export function makeTgClient(apiId: number, apiHash: string, sessionString = ""): TelegramClient {
    return new TelegramClient(
        new StringSession(sessionString),
        apiId,
        apiHash,
        { connectionRetries: 3 }
    );
}

export async function getAccountDialogs(params: {
    apiId: number;
    apiHash: string;
    sessionString: string;
}) {
    const client = makeTgClient(params.apiId, params.apiHash, params.sessionString);
    await client.connect();

    try {
        const dialogs = await client.getDialogs({ limit: 100 });
        const channels: Array<{ id: string; title: string; username?: string }> = [];
        const groups: Array<{ id: string; title: string; username?: string }> = [];
        const users: Array<{ id: string; name: string; username?: string }> = [];

        for (const d of dialogs) {
            const entity: any = d.entity;
            const id = String(d.id);

            if (d.isChannel) {
                if (entity?.broadcast) {
                    channels.push({
                        id,
                        title: d.title || "Nomsiz kanal",
                        username: entity?.username,
                    });
                } else {
                    groups.push({
                        id,
                        title: d.title || "Nomsiz superguruh",
                        username: entity?.username,
                    });
                }
            } else if (d.isGroup) {
                groups.push({
                    id,
                    title: d.title || "Nomsiz guruh",
                    username: entity?.username,
                });
            } else if (d.isUser && !entity?.bot) {
                const name =
                    [entity?.firstName, entity?.lastName].filter(Boolean).join(" ") ||
                    "Noma'lum";
                users.push({
                    id,
                    name,
                    username: entity?.username,
                });
            }
        }

        return { channels, groups, users };
    } finally {
        await client.disconnect();
    }
}

async function executeTaskOnce(taskId: string): Promise<void> {
    const task = await Task.findById(taskId);
    if (!task || !task.isActive) return;

    const owner = await User.findById(task.userId);
    const apiId = owner?.tgApiId || Number(process.env.TG_API_ID);
    const apiHash = owner?.tgApiHash || process.env.TG_API_HASH || "";
    const sessionString = owner?.tgSession || "";

    if (!apiId || !apiHash || !sessionString) {
        console.warn(`Task ${taskId}: Telegram sessiya ulanmagan`);
        return;
    }

    const client = makeTgClient(apiId, apiHash, sessionString);
    await client.connect();

    try {
        const targetPeer = /^-?\d+$/.test(task.groupId)
            ? Number(task.groupId)
            : task.groupId;

        const lastMsgs = await client.getMessages(targetPeer, { limit: 1 });
        const lastText = (lastMsgs[0]?.message || "").trim().toLowerCase();

        const finalText =
            lastText === "salom" && task.altMessage.trim()
                ? task.altMessage
                : task.message;

        if (task.imagePath) {
            await client.sendMessage(targetPeer, {
                message: finalText,
                file: task.imagePath,
            });
        } else {
            await client.sendMessage(targetPeer, { message: finalText });
        }

        await Task.findByIdAndUpdate(taskId, { lastSentAt: new Date() });
    } catch (err: any) {
        if (err?.seconds) {
            const waitMs = (Number(err.seconds) + 5) * 1000;
            console.warn(`FloodWait (${err.seconds}s) task ${taskId} uchun`);
            stopTaskRunner(taskId);
            setTimeout(() => {
                startTaskRunner(task);
            }, waitMs);
        } else {
            console.error(`Task ${taskId} xatosi:`, err?.message || err);
        }
    } finally {
        await client.disconnect();
    }
}

export function startTaskRunner(task: ITask): void {
    const id = String(task._id);
    stopTaskRunner(id);

    if (!task.isActive) return;
    const delayMs = Math.max(task.intervalSec || 180, 60) * 1000;

    void executeTaskOnce(id);
    const timer = setInterval(() => {
        void executeTaskOnce(id);
    }, delayMs);

    activeTimers.set(id, timer);
}

export function stopTaskRunner(taskId: string): void {
    const existing = activeTimers.get(taskId);
    if (existing) {
        clearInterval(existing);
        activeTimers.delete(taskId);
    }
}

export async function restoreActiveTasks(): Promise<void> {
    const tasks = await Task.find({ isActive: true });
    for (const t of tasks) {
        startTaskRunner(t);
    }
    console.log(`${tasks.length} ta faol vazifa qayta ishga tushirildi`);
}