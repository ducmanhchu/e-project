export type WavRecorderControls = {
	stop: () => Promise<File>;
	stream: MediaStream;
};

export async function startWavRecording(): Promise<WavRecorderControls> {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
	});

	const recorder = new MediaRecorder(stream);
	const chunks: Blob[] = [];

	recorder.addEventListener("dataavailable", (e) => {
		if (e.data && e.data.size > 0) chunks.push(e.data);
	});

	recorder.start();

	const stop = (): Promise<File> =>
		new Promise((resolve, reject) => {
			recorder.addEventListener("stop", async () => {
				stream.getTracks().forEach((t) => t.stop());

				if (chunks.length === 0) {
					reject(new Error("Không thu được dữ liệu âm thanh."));
					return;
				}

				try {
					const blob = new Blob(chunks, { type: recorder.mimeType });
					const arrayBuffer = await blob.arrayBuffer();

					const audioContext = new AudioContext();
					const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
					await audioContext.close();

					const wavBlob = audioBufferToWav(audioBuffer);
					resolve(
						new File([wavBlob], "recording.wav", { type: "audio/wav" }),
					);
				} catch (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			});
			recorder.stop();
		});

	return { stop, stream };
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
	const numChannels = buffer.numberOfChannels;
	const sampleRate = buffer.sampleRate;
	const bitsPerSample = 16;
	const bytesPerSample = bitsPerSample / 8;
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;

	const length = buffer.length;
	const interleaved = new Float32Array(length * numChannels);
	for (let ch = 0; ch < numChannels; ch++) {
		const data = buffer.getChannelData(ch);
		for (let i = 0; i < length; i++) {
			interleaved[i * numChannels + ch] = data[i];
		}
	}

	const dataSize = interleaved.length * bytesPerSample;
	const arrayBuffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(arrayBuffer);

	writeString(view, 0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeString(view, 8, "WAVE");

	writeString(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitsPerSample, true);

	writeString(view, 36, "data");
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < interleaved.length; i++) {
		const s = Math.max(-1, Math.min(1, interleaved[i]));
		view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
		offset += 2;
	}

	return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string): void {
	for (let i = 0; i < str.length; i++) {
		view.setUint8(offset + i, str.charCodeAt(i));
	}
}
