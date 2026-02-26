import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import { uploadAssetToStorage } from "@/lib/firebase/storage/uploadAssetToStorage";

// Initialize the Google Cloud TTS client.
// It automatically looks for the GOOGLE_APPLICATION_CREDENTIALS in your .env
const client = new textToSpeech.TextToSpeechClient();

export async function POST(req: Request) {
  try {
    // 1. Get parameters
    const { script, storagePath, userId } = await req.json();

    if (!script) {
      return NextResponse.json({ error: "Missing script" }, { status: 400 });
    }

    // Determine if this is for storage or immediate use
    const isForStorage = storagePath && userId;

    // 2. Construct the request for Google Cloud
    const request = {
      input: { text: script },
      // Select the voice (Journey voices sound very natural/podcaster-like)
      voice: { languageCode: "en-US", name: "en-US-Journey-F" },
      // Ask for an MP3 back
      audioConfig: { audioEncoding: "MP3" as const },
    };

    // 3. Call the API
    const [response] = await client.synthesizeSpeech(request);

    // 4. Convert the raw audio data into a buffer
    const audioBuffer = response.audioContent
      ? Buffer.from(response.audioContent)
      : Buffer.alloc(0);

    // If no storage path, return Base64 (backward compatibility)
    if (!isForStorage) {
      const audioBase64 = audioBuffer.toString("base64");
      const fullAudioString = `data:audio/mp3;base64,${audioBase64}`;
      return NextResponse.json({ audioUrl: fullAudioString });
    }

    // 5. Upload to Firebase Storage if storagePath provided
    const downloadUrl = await uploadAssetToStorage(
      storagePath,
      audioBuffer,
      "audio/mpeg"
    );

    return NextResponse.json({ downloadUrl });

  } catch (error) {
    console.error("TTS Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate audio",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}