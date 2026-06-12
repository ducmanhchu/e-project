import mongoose from "mongoose";
import {
	CONTENT_TYPE,
	WRITING_LEVEL,
	WRITING_TOPIC,
} from "@server/const/writting";

const sentenceSchema = new mongoose.Schema(
	{
		order: { type: Number, required: true },
		vietnameseText: { type: String, required: true },
		referenceAnswer: { type: String, required: true },
	},
	{ _id: false },
);

const vocabRefSchema = new mongoose.Schema(
	{
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Vocabulary",
			required: true,
		},
		sentenceIndex: Number,
	},
	{ _id: false },
);

const reverseTranslationSchema = new mongoose.Schema(
	{
		topic: { type: String, enum: Object.values(WRITING_TOPIC) },
		title: { type: String, required: true, trim: true },
		description: { type: String, trim: true },
		level: { type: String, enum: Object.values(WRITING_LEVEL) },
		totalSentences: { type: Number, default: 0 },
		contentType: {
			type: String,
			enum: Object.values(CONTENT_TYPE),
			default: CONTENT_TYPE.GENERAL,
		},
		vietnameseParagraph: { type: String, required: true },
		sentences: {
			type: [sentenceSchema],
			validate: [(v) => v.length > 0, "sentences must have at least 1 item"],
		},
		vocabularyRefs: [vocabRefSchema],
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: {
			virtuals: true,
			transform(_, ret) {
				delete ret._id;
				if (ret.sentences) {
					ret.sentences = ret.sentences.map(
						({ referenceAnswer: _referenceAnswer, ...rest }) => rest,
					);
				}
			},
		},
	},
);

export const ReverseTranslation = mongoose.model(
	"ReverseTranslation",
	reverseTranslationSchema,
	"reverseTranslations",
);
