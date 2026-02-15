import { NextResponse } from "next/server";
import { reasoningModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    // 1. Get data
    const body = await req.json();
    const { 
      file,           
      fileContext,    
      days,           
      hoursPerDay,    
      formats         // ["video", "text", "image"] 
    } = body;

    // 2. Calculate "Depth" Logic
    const totalHours = days * hoursPerDay;
    let depthInstruction = "";
    
    if (totalHours <= 3) {
      depthInstruction = "High-Level Overview: Focus ONLY on key definitions and main concepts. Be concise.";
    } else if (totalHours <= 10) {
      depthInstruction = "Balanced Depth: Explain concepts clearly with one example each.";
    } else {
      depthInstruction = "Deep Dive: Provide comprehensive details, theoretical background, and multiple complex examples.";
    }

    // 3. The "Instructional Designer" Prompt
    const systemPrompt = `
      You are an expert AI Instructional Designer.
      
      **Goal:** Create a structured study plan for "${file}".
      **Context:** Based strictly on the provided text.
      **Constraints:** ${days} Days, ${hoursPerDay} hours per day.
      **Total Intensity:** ${totalHours} hours total -> Strategy: ${depthInstruction}
      
      **Available Formats:** [${formats?.join(", ")}].
      
      **INSTRUCTIONS:**
      1. **Curate the Journey:** Divide the content logically across ${days} days.
      2. **Smart Format Selection:** For each activity, choose the BEST format from the "Available Formats" list:
         - Use **'video'** for Introductions, High-Level Concepts, or visual storytelling.
         - Use **'text'** for Deep definitions, technical details, or complex data.
         - Use **'image'** (if available) for diagrams, charts, or structural flows.
      3. **MANDATORY QUIZ:** At the end of EVERY Day, you MUST include a 'quiz' activity with 3-5 questions to test retention.
      
      **Activity Content Rules:**
      - If type == 'video': Write a 'lecture_script' (engaging, spoken style) and 'slide_bullets'.
      - If type == 'text': Write detailed 'content' in Markdown.
      - If type == 'quiz': Create a 'quiz_check' object with questions, options, and answers.
      - If type == 'image': Write a 'image_prompt' describing what the diagram should look like.

      **Output Format:**
      Strictly return valid JSON.
      {
        "courseTitle": "String",
        "schedule": [
          {
            "day": Number,
            "title": "String",
            "activities": [
              {
                "type": "video" | "text" | "quiz" | "image", 
                "time_minutes": Number,
                "title": "String",
                "content": "String (Markdown for text)",
                "lecture_script": "String (For video)",
                "slide_bullets": ["String"],
                "image_description": "String (For image)",
                "quiz_check": [ { "question": "", "options": [], "answer": "" } ]
              }
            ]
          }
        ]
      }
    `;

    // 4. Call Gemini
    const result = await reasoningModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\nCONTEXT TO TEACH:\n" + fileContext }]
        }
      ]
    });

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    return NextResponse.json(JSON.parse(responseText));

  } catch (error: unknown) {
    console.error("Study Plan Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate plan", details: errorMessage }, 
      { status: 500 }
    );
  }
}