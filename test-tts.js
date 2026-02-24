const fs = require('fs');

async function runTest() {
  console.log("Calling local TTS API...");

  try {
    const response = await fetch('http://localhost:3000/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // This is the text the AI will speak!
      body: JSON.stringify({ script: "Study BB" })
    });

    const data = await response.json();

    if (data.audioUrl) {
      // The API returns "data:audio/mp3;base64,UklGRiQAAABXQVZF..."
      // We need to split it at the comma and only keep the actual Base64 code
      const base64Data = data.audioUrl.split(',')[1];
      
      // Save it to your computer
      fs.writeFileSync('test-output.mp3', base64Data, 'base64');
      console.log("✅ Success! An audio file named 'test-output.mp3' has been saved in your folder. Go listen to it!");
    } else {
      console.error("❌ API responded, but no audioUrl was found:", data);
    }
  } catch (error) {
    console.error("❌ Failed to connect to the API. Is your Next.js server running?", error);
  }
}

runTest();