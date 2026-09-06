import {
  AUDIO_PREPARATION_ERROR,
  CreatorAudioPreparationError,
  type CreatorAudioWorkerMessage,
} from "../lib/creator-audio";
import { extractCreatorAudio } from "../lib/creator-audio-extract";

const send = (message: CreatorAudioWorkerMessage) => self.postMessage(message);

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    let lastPercent = -1;
    const result = await extractCreatorAudio(event.data, (progress) => {
      const percent = Math.floor(progress * 100);
      if (percent === lastPercent) return;
      lastPercent = percent;
      send({ type: "progress", progress });
    });
    send({ type: "complete", result });
  } catch (error) {
    send({
      type: "error",
      message:
        error instanceof CreatorAudioPreparationError
          ? error.message
          : AUDIO_PREPARATION_ERROR,
    });
  }
};
