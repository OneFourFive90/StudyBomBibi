const fs = require("fs");

async function testImageAPI() {
  console.log("Calling local Hugging Face Image API...");

  try {
    const response = await fetch("http://localhost:3000/api/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // We use 'imagePrompt' now, and put exact text in quotes to test FLUX!
        imagePrompt: '"image_description": "A detailed diagram of a typical animal eukaryotic cell. The outermost layer should be clearly labeled as the \'Cell Membrane\'. Prominently displayed in the center of the cell should be the \'Nucleus\', depicted as a large, spherical or oval organelle containing genetic material (chromatin/nucleolus) and enclosed by a double membrane with pores. Several \'Mitochondria\' should be visible as smaller, bean-shaped organelles with folded inner membranes (cristae) scattered throughout the cytoplasm. Other organelles like Endoplasmic Reticulum, Golgi apparatus, and Ribosomes can be present to provide context, but the emphasis should be on clearly highlighting the three primary structures mentioned (Cell Membrane, Nucleus, Mitochondria) for easy identification."'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API failed:", errorText);
      return;
    }

    const data = await response.json();
    
    // The API returns the full string (data:image/jpeg;base64,...)
    const fullImageString = data.imageUrl;

    // To save it as a physical file on your computer to look at, 
    // we need to chop off the "data:image/jpeg;base64," part first.
    const base64Data = fullImageString.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Save the file (Notice it's a .jpg now, as Hugging Face often returns JPEGs)
    fs.writeFileSync("test-output.jpg", buffer);
    console.log("✅ Success! Image saved as test-output.jpg");

  } catch (error) {
    console.error("❌ Test script error:", error);
  }
}

testImageAPI();