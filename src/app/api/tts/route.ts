import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";

// Initialize the Google Cloud TTS client.
// It automatically looks for the GOOGLE_APPLICATION_CREDENTIALS in your .env
const client = new textToSpeech.TextToSpeechClient();

export async function POST(req: Request) {
  try {
    // 1. Get the text script from the frontend request
    const { script } = await req.json();

    if (!script) {
      return NextResponse.json({ error: "Missing script" }, { status: 400 });
    }

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

    // 4. Convert the raw audio data into a Base64 string so the browser can play it
    const audioBase64 = response.audioContent?.toString("base64");

    // 5. Send it back to the frontend
    return NextResponse.json({ 
      audioUrl: `data:audio/mp3;base64,${audioBase64}` 
    });

  } catch (error) {
    console.error("TTS Error:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" }, 
      { status: 500 }
    );
  }
}