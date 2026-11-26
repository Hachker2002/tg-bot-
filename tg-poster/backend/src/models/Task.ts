import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
    userId: mongoose.Types.ObjectId;
    groupId: string;
    message: string;
    altMessage: string;
    imagePath: string | null;
    intervalSec: number;
    isActive: boolean;
    lastSentAt: Date | null;
    createdAt: Date;
}

const TaskSchema = new Schema<ITask>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        groupId: { type: String, required: true },
        message: { type: String, required: true },
        altMessage: { type: String, default: "" },
        imagePath: { type: String, default: null },
        intervalSec: { type: Number, default: 180 },
        isActive: { type: Boolean, default: true },
        lastSentAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export const Task = mongoose.model<ITask>("Task", TaskSchema);