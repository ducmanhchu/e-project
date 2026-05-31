import type {
	AzureToken,
	PronunciationResultPayload,
} from "@shared/types/conversation";

const TTS_VOICE = "en-US-JennyNeural";
const PROSODY_BREAK_THRESHOLD = 0.5;

type SpeechSdkModule = typeof import("microsoft-cognitiveservices-speech-sdk");

let speechSdkModule: Promise<SpeechSdkModule> | null = null;

/** Tải Azure Speech SDK một lần — tách khỏi initial bundle. */
function loadSpeechSdk(): Promise<SpeechSdkModule> {
	speechSdkModule ??= import("microsoft-cognitiveservices-speech-sdk");
	return speechSdkModule;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWordAssessment(w: any) {
	const pa = w.PronunciationAssessment ?? {};
	const unexpectedBreak = pa.Feedback?.Prosody?.Break?.UnexpectedBreak;
	const missingBreak = pa.Feedback?.Prosody?.Break?.MissingBreak;
	let errorType = pa.ErrorType ?? "None";

	if (errorType === "None") {
		if ((unexpectedBreak?.Confidence ?? 0) > PROSODY_BREAK_THRESHOLD) {
			errorType = "UnexpectedBreak";
		} else if ((missingBreak?.Confidence ?? 0) > PROSODY_BREAK_THRESHOLD) {
			errorType = "MissingBreak";
		}
	}

	return {
		Word: w.Word,
		AccuracyScore: pa.AccuracyScore,
		ErrorType: errorType,
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

					const payload: PronunciationResultPayload = {
						accuracyScore: pronunciationResult.accuracyScore,
						fluencyScore: pronunciationResult.fluencyScore,
						completenessScore: pronunciationResult.completenessScore,
						pronunciationScore: pronunciationResult.pronunciationScore,
						prosodyScore: pronunciationResult.prosodyScore,
						recognizedText: result.text,
						words: parsedJson.NBest[0].Words.map(mapWordAssessment),
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
