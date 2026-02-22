// import { NextResponse } from "next/server";
// import { reasoningModel } from "@/lib/gemini";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { 
//       mode,              // mcq or past_year
//       sourceText,        // Array of strings (study materials)
//       pastYearText,      // Array of strings (pass year paper format)
//       numQuestions,      // up to 60
//       customPrompt,      // user requirement
//       duration           
//     } = body;

//     if (!sourceText || !Array.isArray(sourceText)) {
//       return NextResponse.json({ error: "Missing source text." }, { status: 400 });
//     }

//     const combinedSource = sourceText.map((text, i) => `--- SOURCE ${i + 1} ---\n${text}`).join("\n\n");

//     let systemPrompt = "";

//     // MODE 1: STANDARD MCQ QUIZ
//     if (mode === "mcq") {
//       systemPrompt = `
//         You are an expert exam writer. Generate a multiple-choice quiz based ONLY on the provided source material.
        
//         **Constraints:**
//         - Number of Questions: ${numQuestions}
//         - User Custom Instructions: "${customPrompt || 'None'}"
        
//         **Instructions:**
//         1. Create exactly ${numQuestions} MCQs.
//         2. Ensure one unequivocally correct answer per question.
//         3. Include a short explanation for WHY the answer is correct.
        
//         **Output Format:** Strictly JSON.
//         {
//           "title": "Generated MCQ Quiz",
//           "questions": [
//             {
//               "id": Number,
//               "type": "mcq",
//               "question": "String",
//               "options": ["String", "String", "String", "String"],
//               "answer": "String (Must exactly match one of the options)",
//               "explanation": "String"
//             }
//           ]
//         }
//       `;
//     } 
//     // ==========================================
//     // MODE 2: PAST YEAR PAPER MIMIC
//     // ==========================================
//     else if (mode === "past_year") {
//       systemPrompt = `
//         You are an expert university examiner. Your task is to generate a Mock Exam that MIMICS the format of a provided Past Year Paper, but tests the knowledge found in the Source Material.
        
//         **Constraints:**
//         - Time Allowed: ${duration}
//         - User Custom Instructions: "${customPrompt || 'None'}"
//         - Pass Year Paper Format: Use the provided past year paper as a strict template for question types, sections, and overall structure. Do NOT deviate from this format.
        
//         **Instructions:**
//         1. Analyze the "PAST YEAR PAPER FORMAT" to understand the structure (e.g., Section A: MCQs, Section B: Short Answer, Section C: Essay).
//         2. Generate NEW questions that fit this exact structure, but derive the facts/content ONLY from the "SOURCE MATERIAL".
//         3. For 'mcq' types, provide options and the exact answer.
//         4. For 'structured' or 'essay' types, provide an 'answer_key' or grading rubric instead of options.
        
//         **Output Format:** Strictly JSON.
//         {
//           "title": "Mock Exam Paper",
//           "duration": "${duration}",
//           "questions": [
//             {
//               "id": Number,
//               "section": "String (e.g., 'Section A: Multiple Choice')",
//               "type": "mcq" | "structured",
//               "question": "String",
//               "options": ["String", "String", "String", "String"] | null,
//               "answer_key": "String (Exact option for MCQ, or detailed bullet-point answer key for structured)"
//             }
//           ]
//         }
//       `;
//     } else {
//       return NextResponse.json({ error: "Invalid mode. Use 'mcq' or 'past_year'." }, { status: 400 });
//     }

//     // Prepare the content for Gemini (This safely adds the text just ONCE)
//     const finalPrompt = mode === "past_year" 
//       ? `${systemPrompt}\n\n=== SOURCE MATERIAL ===\n${combinedSource}\n\n=== PAST YEAR PAPER FORMAT ===\n${pastYearText?.join("\n\n") || ""}`
//       : `${systemPrompt}\n\n=== SOURCE MATERIAL ===\n${combinedSource}`;

//     // Call Gemini
//     const result = await reasoningModel.generateContent({
//       contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
//     });

//     let responseText = result.response.text();
//     responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

//     return NextResponse.json(JSON.parse(responseText));

//   } catch (error: unknown) {
//     console.error("Quiz Gen Error:", error);
//     const errorMessage = error instanceof Error ? error.message : "Unknown error";
//     return NextResponse.json({ error: "Failed to generate quiz", details: errorMessage }, { status: 500 });
//   }
// }