import type {
	AzureToken,
	BreakWordError,
	PronunciationResultPayload,
	PronunciationWordError,
	WordAssessment,
} from "@shared/types/conversation";

const TTS_VOICE = "en-US-JennyNeural";

// BreakLength dùng đơn vị 100ns của Azure (1s = 10_000_000 ticks).
// Client suy luận lỗi ngắt nghỉ chỉ từ BreakLength + dấu câu trước từ (không dùng Confidence).
const MID_PHRASE_UNEXPECTED_MIN_TICKS = 4_000_000; // > 0.4s giữa từ trong câu → UnexpectedBreak
const COMMA_MISSING_MAX_TICKS = 1_500_000; // < 0.15s sau phẩy → MissingBreak; vùng an toàn 0.15s–0.7s
const COMMA_UNEXPECTED_MIN_TICKS = 7_000_000; // > 0.7s sau phẩy → UnexpectedBreak
const OTHER_PUNCT_MISSING_MAX_TICKS = 4_000_000; // < 0.4s sau dấu kết câu → MissingBreak; vùng an toàn 0.4s–1.5s
const OTHER_PUNCT_UNEXPECTED_MIN_TICKS = 15_000_000; // > 1.5s sau dấu kết câu → UnexpectedBreak

const SENTENCE_END_PUNCT_RE = /[.!?;:—-]/;
const COMMA_PUNCT_RE = /,/;

type SpeechSdkModule = typeof import("microsoft-cognitiveservices-speech-sdk");

type PunctuationKind = "none" | "comma" | "other";

type PunctuationInfo = {
	kind: PunctuationKind;
};

let speechSdkModule: Promise<SpeechSdkModule> | null = null;

/** Tải Azure Speech SDK một lần — tách khỏi initial bundle. */
function loadSpeechSdk(): Promise<SpeechSdkModule> {
	speechSdkModule ??= import("microsoft-cognitiveservices-speech-sdk");
	return speechSdkModule;
}

/**
 * Phân loại dấu câu trong khoảng trống trước một từ của reference text.
 * @param gap - Chuỗi giữa hai từ liên tiếp trong reference text
 * @returns Loại dấu câu áp dụng rule ngắt nghỉ
 */
function getPunctuationKindFromGap(gap: string): PunctuationKind {
	if (!gap.trim()) return "none";
	if (SENTENCE_END_PUNCT_RE.test(gap)) return "other";
	if (COMMA_PUNCT_RE.test(gap)) return "comma";
	return "none";
}

/**
 * Quét reference text, trả về loại dấu câu trước mỗi từ.
 * @param referenceText - Câu mẫu
 * @returns Mảng punctuation info theo thứ tự từ trong reference
 */
function getPunctuationBeforeFlags(referenceText: string): PunctuationInfo[] {
	const flags: PunctuationInfo[] = [];
	const wordRe = /\b[\w']+\b/g;
	let prevEnd = 0;
	let match: RegExpExecArray | null;

	while ((match = wordRe.exec(referenceText)) !== null) {
		const gap = referenceText.slice(prevEnd, match.index);
		flags.push({ kind: getPunctuationKindFromGap(gap) });
		prevEnd = match.index + match[0].length;
	}

	return flags;
}

/**
 * Align punctuation info với words từ Azure (xử lý Insertion/Omission).
 * @param referenceText - Câu mẫu
 * @param azureWords - Words thô từ Azure JSON
 * @returns Punctuation info tương ứng từng word Azure
 */
function alignPunctuationWithWords(
	referenceText: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	azureWords: any[],
): PunctuationInfo[] {
	const refFlags = getPunctuationBeforeFlags(referenceText);
	const result: PunctuationInfo[] = [];
	let refIdx = 0;

	for (const w of azureWords) {
		const azureError = w.PronunciationAssessment?.ErrorType ?? "None";

		if (azureError === "Insertion") {
			result.push({ kind: "none" });
			continue;
		}

		result.push(refFlags[refIdx] ?? { kind: "none" });
		refIdx++;
	}

	return result;
}

/**
 * Kiểm tra Break.ErrorTypes chỉ chứa None.
 * @param errorTypes - Mảng ErrorTypes từ Azure
 */
function isBreakErrorTypesNone(errorTypes: string[] | undefined): boolean {
	if (!errorTypes || errorTypes.length === 0) return true;
	return errorTypes.length === 1 && errorTypes[0] === "None";
}

/**
 * Suy luận lỗi phát âm từ từ từ Azure ErrorType.
 * @param pa - PronunciationAssessment object từ Azure
 * @returns Lỗi phát âm từ
 */
function resolvePronunciationError(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	pa: any,
): PronunciationWordError {
	const azureError = pa.ErrorType ?? "None";
	if (
		azureError === "Mispronunciation" ||
		azureError === "Omission" ||
		azureError === "Insertion"
	) {
		return azureError;
	}
	return "None";
}

/**
 * Suy luận lỗi ngắt nghỉ: ưu tiên Azure, fallback theo BreakLength và dấu câu trước từ.
 * @param pa - PronunciationAssessment object từ Azure
 * @param punctInfo - Loại dấu câu trước từ trong reference text
 * @returns Lỗi ngắt nghỉ
 */
function resolveBreakError(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	pa: any,
	punctInfo: PunctuationInfo,
): BreakWordError {
	const azureError = pa.ErrorType ?? "None";
	if (azureError === "UnexpectedBreak") return "UnexpectedBreak";
	if (azureError === "MissingBreak") return "MissingBreak";

	const breakInfo = pa.Feedback?.Prosody?.Break;
	const breakErrorTypes: string[] = breakInfo?.ErrorTypes ?? ["None"];

	if (breakErrorTypes.includes("UnexpectedBreak")) return "UnexpectedBreak";
	if (breakErrorTypes.includes("MissingBreak")) return "MissingBreak";

	if (!isBreakErrorTypesNone(breakErrorTypes)) return "None";

	const breakLength: number = breakInfo?.BreakLength ?? 0;

	return resolveBreakErrorFromLength(breakLength, punctInfo.kind);
}

/**
 * Quy tắc ngắt nghỉ theo BreakLength (đơn vị 100ns) và ngữ cảnh dấu câu.
 * @param breakLength - Độ dài pause trước từ từ Azure
 * @param punctKind - Loại dấu câu trước từ
 * @returns Lỗi ngắt nghỉ hoặc None nếu nằm trong vùng an toàn
 */
function resolveBreakErrorFromLength(
	breakLength: number,
	punctKind: PunctuationKind,
): BreakWordError {
	if (punctKind === "none") {
		if (breakLength > MID_PHRASE_UNEXPECTED_MIN_TICKS) {
			return "UnexpectedBreak";
		}
		return "None";
	}

	if (punctKind === "comma") {
		if (breakLength < COMMA_MISSING_MAX_TICKS) return "MissingBreak";
		if (breakLength > COMMA_UNEXPECTED_MIN_TICKS) return "UnexpectedBreak";
		return "None";
	}

	if (breakLength < OTHER_PUNCT_MISSING_MAX_TICKS) return "MissingBreak";
	if (breakLength > OTHER_PUNCT_UNEXPECTED_MIN_TICKS) return "UnexpectedBreak";
	return "None";
}

/**
 * Map một word từ Azure JSON sang WordAssessment.
 * @param w - Word object thô từ Azure
 * @param punctInfo - Thông tin dấu câu trước từ
 * @returns WordAssessment với pronunciationError và breakError tách biệt
 */
function mapWordAssessment(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	w: any,
	punctInfo: PunctuationInfo,
): WordAssessment {
	const pa = w.PronunciationAssessment ?? {};
	const breakInfo = pa.Feedback?.Prosody?.Break;
	const unexpectedBreak = breakInfo?.UnexpectedBreak;
	const missingBreak = breakInfo?.MissingBreak;
	const breakLength: number | undefined = breakInfo?.BreakLength;

	return {
		Word: w.Word,
		AccuracyScore: pa.AccuracyScore,
		pronunciationError: resolvePronunciationError(pa),
		breakError: resolveBreakError(pa, punctInfo),
		...(breakLength !== undefined && { BreakLength: breakLength }),
		...(unexpectedBreak && { UnexpectedBreak: unexpectedBreak }),
		...(missingBreak && { MissingBreak: missingBreak }),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		Phonemes: w.Phonemes?.map((p: any) => ({
			Phoneme: p.Phoneme,
			AccuracyScore: p.PronunciationAssessment.AccuracyScore,
		})),
	};
}

/**
 * Tổng hợp giọng nói Azure TTS.
 * @param text - Văn bản cần đọc
 * @param auth - Token và region Azure
 * @returns Blob audio wav
 */
export async function synthesizeSpeech(
	text: string,
	auth: AzureToken,
): Promise<Blob> {
	const SpeechSDK = await loadSpeechSdk();

	return new Promise((resolve, reject) => {
		const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
			auth.token,
			auth.region,
		);
		speechConfig.speechSynthesisVoiceName = TTS_VOICE;

		const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

		synthesizer.speakTextAsync(
			text,
			(result) => {
				synthesizer.close();
				if (
					result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted
				) {
					const blob = new Blob([result.audioData], { type: "audio/wav" });
					resolve(blob);
				} else {
					reject(
						new Error(result.errorDetails || "Lỗi tổng hợp giọng nói Azure."),
					);
				}
			},
			(error) => {
				synthesizer.close();
				reject(new Error(String(error)));
			},
		);
	});
}

/**
 * Đánh giá phát âm từ file wav so với reference text.
 * @param audioFile - File ghi âm
 * @param referenceText - Câu mẫu
 * @param authData - Token Azure
 * @returns Kết quả chấm điểm phát âm
 */
export async function assessPronunciation(
	audioFile: File,
	referenceText: string,
	authData: AzureToken,
): Promise<PronunciationResultPayload> {
	const SpeechSDK = await loadSpeechSdk();

	return new Promise((resolve, reject) => {
		const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
			authData.token,
			authData.region,
		);
		speechConfig.speechRecognitionLanguage = "en-US";

		const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(audioFile);

		const recognizer = new SpeechSDK.SpeechRecognizer(
			speechConfig,
			audioConfig,
		);

		const pronunciationAssessmentConfig =
			new SpeechSDK.PronunciationAssessmentConfig(
				referenceText,
				SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
				SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
				true,
			);

		pronunciationAssessmentConfig.enableProsodyAssessment = true;

		pronunciationAssessmentConfig.applyTo(recognizer);

		recognizer.recognizeOnceAsync(
			(result) => {
				if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
					const pronunciationResult =
						SpeechSDK.PronunciationAssessmentResult.fromResult(result);

					const resultJson = result.properties.getProperty(
						SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult,
					);
					const parsedJson = JSON.parse(resultJson);

					const rawAzureWords = parsedJson.NBest[0].Words;
					const punctInfos = alignPunctuationWithWords(
						referenceText,
						rawAzureWords,
					);
					const words = rawAzureWords.map(
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(w: any, i: number) => mapWordAssessment(w, punctInfos[i]),
					);

					const payload: PronunciationResultPayload = {
						accuracyScore: pronunciationResult.accuracyScore,
						fluencyScore: pronunciationResult.fluencyScore,
						completenessScore: pronunciationResult.completenessScore,
						pronunciationScore: pronunciationResult.pronunciationScore,
						prosodyScore: pronunciationResult.prosodyScore,
						recognizedText: result.text,
						words,
					};

					recognizer.close();
					resolve(payload);
				} else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
					recognizer.close();
					reject(
						new Error("Không thể nhận diện được giọng nói trong tệp âm thanh."),
					);
				} else if (result.reason === SpeechSDK.ResultReason.Canceled) {
					const cancellation = SpeechSDK.CancellationDetails.fromResult(result);
					recognizer.close();
					reject(new Error(`Lỗi từ Azure: ${cancellation.errorDetails}`));
				}
			},
			(error: string) => {
				recognizer.close();
				reject(new Error(`Lỗi SDK: ${error}`));
			},
		);
	});
}
