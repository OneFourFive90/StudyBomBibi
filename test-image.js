const fs = require('fs');

async function runImageTest() {
  console.log("Calling local Image API...");

  try {
    const response = await fetch('http://localhost:3000/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slideTitle: "Title: Introduction to Network Routing Protocol: ospf, bgp, rip" })
    });

    const data = await response.json();

    if (data.imageUrl) {
      // Split off the "data:image/png;base64," part
      const base64Data = data.imageUrl.split(',')[1];
      
      // Save it as a PNG file
      fs.writeFileSync('test-output.png', base64Data, 'base64');
      console.log("✅ Success! An image named 'test-output.png' has been saved in your folder. Open it to see your slide background!");
    } else {
      console.error("❌ API responded, but no imageUrl was found:", data);
    }
  } catch (error) {
    console.error("❌ Failed to connect to the API. Is your Next.js server running?", error);
  }
}

runImageTest();