import { NextResponse } from "next/server";
import { reasoningModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    // 1. Get data
    const body = await req.json();
    const { 
      file,           
      extractText,    
      days,           
      hoursPerDay,    
      formats // ["video", "text", "image"] 
    } = body;
    
    if (!extractText || !Array.isArray(extractText)) {
      return NextResponse.json({ error: "Invalid Input: 'extractText' is missing." }, { status: 400 });
    }

    const combinedContext = extractText.map((text: string, index: number) => `
      --- SOURCE ${index + 1}: ${file[index]} ---
      ${text}
    `).join("\n\n");

    // 2. Calculate "Depth" Logic
    const totalHours = days * hoursPerDay;
    let depthInstruction = "";
    
    if (totalHours <= 3) {
      depthInstruction = "Detailed Overview: Provide comprehensive summaries of key concepts. Do not be brief; explain 'why' and 'how' for every major point.";
    } else if (totalHours <= 10) {
      depthInstruction = "In-Depth Analysis: Explain every concept in detail with multiple real-world examples. content should be substantial and suitable for the study level base on the material provide.";
    } else {
      depthInstruction = "Master Class: Provide exhaustive theoretical background, extensive case studies, and advanced critical analysis. The content must be highly detailed and rigorous.";
    }

    //final quiz
    const finalExamInstruction = days > 1 
      ? `CRITICAL: Since the course is ${days} days long, you MUST create a final 'Day ${days}' (which is at last day) titled 'Final Assessment'. 
      This module must contain a 'quiz' activity with 10 challenging questions covering the ENTIRE course. 
      This final assessment is after the quiz for the last day.`
      : "No final exam needed for a 1-day course.";

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
      4. **FINAL EXAM:** ${finalExamInstruction}
      5. If the content is related to Programming or Math, you MUST include a 'practice_problem' field in the 'text' activities.
      
      **CRITICAL: VIDEO STRUCTURE**
      If type == 'video', do NOT provide a single script. Instead, break the lecture into **a few of distinct slides** (segments).
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
                // FOR TEXT ACTIVITIES
                "content": "String (Markdown)",
                "practice_problem": "String (Optional)",

                // FOR VIDEO ACTIVITIES (New Structure!)
                "video_segments": [
                   {
                      "slide_title": "String (Title of this specific slide)",
                      "bullets": ["String", "String"],
                      "script": "String (The voiceover for THIS slide only)"
                   }
                ],

                // FOR IMAGE ACTIVITIES
                "image_description": "String",

                // FOR QUIZ ACTIVITIES
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
          parts: [{ text: systemPrompt + "\n\nCONTEXT TO TEACH:\n" + combinedContext }]
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