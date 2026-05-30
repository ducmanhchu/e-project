import mongoose from "mongoose";
import { DECK_LIMITS, CARD_STATUS } from "@server/const/deck";

const cardSchema = new mongoose.Schema(
	{
		deckId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Deck",
			required: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		word: {
			type: String,
			required: true,
			trim: true,
			maxlength: DECK_LIMITS.WORD_MAX,
		},
		meaning: {
			type: String,
			required: true,
			trim: true,
			maxlength: DECK_LIMITS.MEANING_MAX,
		},
		ipa: { type: String, trim: true, maxlength: DECK_LIMITS.IPA_MAX },
		partOfSpeech: {
			type: String,
			trim: true,
			maxlength: DECK_LIMITS.PART_OF_SPEECH_MAX,
		},
		enExample: {
			type: String,
			trim: true,
			maxlength: DECK_LIMITS.EN_EXAMPLE_MAX,
		},
		viExample: {
			type: String,
			trim: true,
			maxlength: DECK_LIMITS.VI_EXAMPLE_MAX,
		},
		audio: String,
		status: {
			type: String,
			enum: [CARD_STATUS.KNOWN, CARD_STATUS.UNKNOWN],
			default: CARD_STATUS.UNKNOWN,
		},
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: {
			virtuals: true,
			transform(_, ret) {
				delete ret._id;
			},
		},
	},
);

cardSchema.index({ deckId: 1, createdAt: -1 });
cardSchema.index({ userId: 1, deckId: 1 });
cardSchema.index({ deckId: 1, status: 1 });

export const Card = mongoose.model("Card", cardSchema, "cards");
