import { USER_ROLE } from "@server/const/user";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: [USER_ROLE.USER, USER_ROLE.ADMIN],
      default: USER_ROLE.USER,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Credit wallet (only permanent balance; subscriptions removed)
    credits: { type: Number, default: 0, min: 0 },

    // Daily checkin tracking — null until first checkin. CAS target in walletService.grantDailyCheckin.
    lastCheckinAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret._id;
        delete ret.password;
      },
    },
  },
);

const User = mongoose.model("User", userSchema, "users");
export default User;
