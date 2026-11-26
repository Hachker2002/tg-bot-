import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: "user" | "admin";
    plan: "free" | "pro";
    planExpiresAt: Date | null;
    tgApiId?: number;
    tgApiHash?: string;
    tgSession: string;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        plan: { type: String, enum: ["free", "pro"], default: "free" },
        planExpiresAt: { type: Date, default: null },
        tgApiId: { type: Number },
        tgApiHash: { type: String, default: "" },
        tgSession: { type: String, default: "" },
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);