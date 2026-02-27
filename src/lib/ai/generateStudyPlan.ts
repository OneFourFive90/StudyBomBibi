import { reasoningModel } from "@/lib/gemini";
import { AIStudyPlanResponse } from "@/lib/firebase/firestore/study-plan/saveStudyPlanToFirestore";
import * as fs from "fs";
import * as path from "path";

/**
 * Cleans JSON string by properly escaping control characters
 * Uses character-by-character parsing to respect escape sequences
 */
function cleanJsonString(jsonStr: string): string {
  // First, extract just the JSON object from the response
  const firstBrace = jsonStr.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("No JSON object found in response");
  }

  let braceCount = 0;
  let endBrace = -1;
  for (let i = firstBrace; i < jsonStr.length; i++) {
    if (jsonStr[i] === "{") braceCount++;
    if (jsonStr[i] === "}") {
      braceCount--;
      if (braceCount === 0) {
        endBrace = i;
        break;
      }
    }
  }

  if (endBrace === -1) {
    throw new Error("Malformed JSON: unmatched braces");
  }

  // Extract just the JSON object
  jsonStr = jsonStr.substring(firstBrace, endBrace + 1);

  // Parse character by character, only escaping unescaped control chars in strings
  let result = "";
  let inString = false;
  let i = 0;

  while (i < jsonStr.length) {
    const char = jsonStr[i];
    const prevChar = i > 0 ? jsonStr[i - 1] : "";
    
    // Check if we're entering/exiting a string (not escaped)
    if (char === '"' && prevChar !== "\\") {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    // If we're in a string, escape unescaped control characters
    if (inString) {
      switch (char) {
        case "\n":
          result += "\\n";
          break;
        case "\r":
          result += "\\r";
          break;
        case "\t":
          result += "\\t";
          break;
        case "\0":
          result += "\\0";
          break;
        case "\\":
          // Keep existing escapes
          result += char;
          break;
        default:
          result += char;
      }
    } else {
      result += char;
    }
    
    i++;
  }

  return result;
}

export interface GenerateStudyPlanInput {
  fileNames: string[];
  extractedTexts: string[];
  days: number;
  hoursPerDay: number;
  formats: string[]; // ["video", "text", "image"]
}

/**
 * Generate a study plan using Gemini AI
 * Extracted from the API route for direct function calls
 */
export async function generateStudyPlan(
  input: GenerateStudyPlanInput
): Promise<AIStudyPlanResponse> {
  const { fileNames, extractedTexts, days, hoursPerDay, formats } = input;

  // Validate input
  if (!extractedTexts || !Array.isArray(extractedTexts) || extractedTexts.length === 0) {
    throw new Error("Invalid Input: 'extractedTexts' is missing or empty.");
  }

  // Combine context from all files
  const combinedContext = extractedTexts
    .map(
      (text: string, index: number) => `
      --- SOURCE ${index + 1}: ${fileNames[index]} ---
      ${text}
    `
    )
    .join("\n\n");

  // Calculate "Depth" Logic based on total study hours
  const totalHours = days * hoursPerDay;
  let depthInstruction = "";

  if (totalHours <= 3) {
    depthInstruction =
      "Detailed Overview: Provide comprehensive summaries of key concepts. Do not be brief; explain 'why' and 'how' for every major point.";
  } else if (totalHours <= 10) {
    depthInstruction =
      "In-Depth Analysis: Explain every concept in detail with multiple real-world examples. content should be substantial and suitable for the study level base on the material provide.";
  } else {
    depthInstruction =
      "Master Class: Provide exhaustive theoretical background, extensive case studies, and advanced critical analysis. The content must be highly detailed and rigorous.";
  }

  // Final exam instruction
  const finalExamInstruction =
    days > 1
      ? `CRITICAL: Since the course is ${days} days long, you MUST create a final 'Day ${days}' (which is at last day) titled 'Final Assessment'. 
      This module must contain a 'quiz' activity with 10 challenging questions covering the ENTIRE course. 
      This final assessment is after the quiz for the last day.`
      : "No final exam needed for a 1-day course.";

  // The "Instructional Designer" Prompt
  const systemPrompt = `
      You are an expert AI Instructional Designer.
      
      **Goal:** Create a structured study plan for "${fileNames.join(", ")}".
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

  // Call Gemini
  const result = await reasoningModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt + "\n\nCONTEXT TO TEACH:\n" + combinedContext },
        ],
      },
    ],
  });

  let responseText = result.response.text();
  
  // Save raw Gemini response for debugging
  try {
    const debugDir = path.join(process.cwd(), "debug", "gemini-responses");
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `response-${timestamp}.json`;
    const filePath = path.join(debugDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      courseFiles: fileNames,
      duration: `${days} days, ${hoursPerDay}h/day`,
      formats: formats,
      responseLength: responseText.length,
      rawResponse: responseText,
    }, null, 2));
    
    console.log(`[Gemini Response] Saved to: ${filePath}`);
  } catch (saveError) {
    console.warn("[Gemini Response] Could not save response to file:", saveError);
  }
  
  // Log original response for debugging
  console.log("[Gemini Response] Full Response Length:", responseText.length);
  console.log("[Gemini Response] First 500 chars:", responseText.substring(0, 500));
  
  responseText = responseText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // Clean up problematic control characters in JSON
  // This handles cases where the AI generates unescaped newlines/tabs in string values
  responseText = cleanJsonString(responseText);

  let parsed: AIStudyPlanResponse;
  
  try {
    parsed = JSON.parse(responseText);
  } catch (parseError) {
    // Enhanced error message with position info
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    console.error("[JSON Parse Error] Details:", errorMsg);
    console.error("[JSON Parse Error] Response char count:", responseText.length);
    console.error("[JSON Parse Error] Response last 500 chars:", responseText.substring(Math.max(0, responseText.length - 500)));
    
    // Save error response for debugging
    try {
      const debugDir = path.join(process.cwd(), "debug", "gemini-responses");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `error-response-${timestamp}.json`;
      const filePath = path.join(debugDir, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify({
        timestamp: new Date().toISOString(),
        courseFiles: fileNames,
        duration: `${days} days, ${hoursPerDay}h/day`,
        formats: formats,
        error: errorMsg,
        cleanedResponseLength: responseText.length,
        cleanedResponse: responseText,
      }, null, 2));
      
      console.error(`[JSON Parse Error] Saved error details to: ${filePath}`);
    } catch (saveError) {
      console.warn("[JSON Parse Error] Could not save error response to file:", saveError);
    }
    
    // Try to find the error position in the original response
    const match = errorMsg.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1], 10);
      const start = Math.max(0, pos - 200);
      const end = Math.min(responseText.length, pos + 200);
      console.error(`[JSON Parse Error] Context around position ${pos}:`, responseText.substring(start, end));
    }
    
    throw new Error(`Failed to parse AI response as JSON: ${errorMsg}`);
  }

  // Validate response structure
  if (!parsed.courseTitle || !parsed.schedule) {
    throw new Error("Invalid AI response: missing courseTitle or schedule");
  }

  // Save successfully parsed response
  try {
    const debugDir = path.join(process.cwd(), "debug", "gemini-responses");
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `success-response-${timestamp}.json`;
    const filePath = path.join(debugDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      courseFiles: fileNames,
      duration: `${days} days, ${hoursPerDay}h/day`,
      formats: formats,
      courseTitle: parsed.courseTitle,
      scheduleLength: parsed.schedule.length,
      totalActivities: parsed.schedule.reduce((sum, day) => sum + (day.activities?.length || 0), 0),
      parsedResponse: parsed,
    }, null, 2));
    
    console.log(`[Gemini Success] Saved parsed response to: ${filePath}`);
  } catch (saveError) {
    console.warn("[Gemini Success] Could not save parsed response to file:", saveError);
  }

  return parsed;
}
