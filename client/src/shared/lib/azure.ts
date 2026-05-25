import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

import type {
	AzureToken,
	PronunciationResultPayload,
} from "@shared/types/conversation";

const TTS_VOICE = "en-US-JennyNeural";
const PROSODY_BREAK_THRESHOLD = 0.5;

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

export function synthesizeSpeech(
	text: string,
	auth: AzureToken,
): Promise<Blob> {
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

export const assessPronunciation = (
	audioFile: File,
	referenceText: string,
	authData: AzureToken,
): Promise<PronunciationResultPayload> => {
	return new Promise((resolve, reject) => {
		// 1. Cấu hình Speech Service bằng Auth Token
		const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
			authData.token,
			authData.region,
		);
		speechConfig.speechRecognitionLanguage = "en-US";

		// 2. Cấu hình Audio Input
		const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(audioFile);

		// 3. Khởi tạo Recognizer
		const recognizer = new SpeechSDK.SpeechRecognizer(
			speechConfig,
			audioConfig,
		);

		// 4. Khởi tạo cấu hình Đánh giá phát âm
		const pronunciationAssessmentConfig =
			new SpeechSDK.PronunciationAssessmentConfig(
				referenceText,
				SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
				SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
				true,
			);

		pronunciationAssessmentConfig.enableProsodyAssessment = true;

		pronunciationAssessmentConfig.applyTo(recognizer);

		// 5. Thực thi recognizeOnceAsync
		recognizer.recognizeOnceAsync(
			(result: SpeechSDK.SpeechRecognitionResult) => {
				if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
					// Trích xuất kết quả đánh giá thông qua class chuẩn của SDK
					const pronunciationResult =
						SpeechSDK.PronunciationAssessmentResult.fromResult(result);

					// Trích xuất JSON raw để lấy chi tiết Phonemes và Miscues chính xác nhất
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
};
