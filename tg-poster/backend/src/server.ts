import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import telegramRoutes from "./routes/telegram";
import taskRoutes from "./routes/tasks";
import { restoreActiveTasks } from "./services/runner";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/tasks", taskRoutes);

const port = Number(process.env.PORT) || 4000;

connectDB()
    .then(async () => {
        await restoreActiveTasks();
        app.listen(port, () => {
            console.log(`Backend http://localhost:${port} da ishga tushdi`);
        });
    })
    .catch((err) => {
        console.error("Serverni ishga tushirishda xato:", err);
    });