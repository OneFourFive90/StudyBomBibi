import { reasoningModel } from "@/lib/gemini";
import { AIGeneratedQuiz } from "@/lib/firebase/firestore/saveQuizToFirestore";

/**
 * Generate a quiz using Gemini AI
 * @param mode - Quiz mode (mcq or past_year)
 * @param sourceText - Array of study materials
 * @param pastYearText - Array of past year paper format (for past_year mode)
 * @param numQuestions - Number of questions to generate
 * @param customPrompt - Custom user instructions
 * @param duration - Time duration (for past_year mode)
 * @returns Generated quiz data
 */
export async function generateQuizWithAI(
  mode: "mcq" | "past_year",
  sourceText: string[],
  numQuestions: number,
  customPrompt?: string,
  pastYearText?: string[],
  duration?: string,
  totalMarks?: number
): Promise<AIGeneratedQuiz> {
  if (!sourceText || !Array.isArray(sourceText)) {
    throw new Error("Missing or invalid source text.");
  }

  const hasPastYearTemplate = Boolean(pastYearText && pastYearText.some((text) => text.trim().length > 0));

  const combinedSource = sourceText
    .map((text, i) => `--- SOURCE ${i + 1} ---\n${text}`)
    .join("\n\n");

  let systemPrompt = "";

  // MODE 1: STANDARD MCQ QUIZ
  if (mode === "mcq") {
    systemPrompt = `
      You are an expert exam writer. Your task is to generate a high-quality multiple-choice quiz. 
      Treat the provided source material as a syllabus. 
      First, analyze the material to identify the core topics, concepts, and required knowledge. 
      Then, generate questions that test a deep understanding of these specific topics.

      **Constraints:**
      - Number of Questions: ${numQuestions}
      - Language: STRICTLY ENGLISH. All generated questions, options, answers, explanations, and titles MUST be in English, regardless of the language of the source material.
      - User Custom Instructions: "${customPrompt || "None"}"
      
      **Instructions:**
      1. Create exactly ${numQuestions} MCQs based on the core topics found in the source material.
      2. Ensure one unequivocally correct answer per question.
      3. Include a short explanation for WHY the answer is correct.
      4. Generate a short, descriptive, and professional title for the quiz based on the core topics.
      5. Numbering rules are strict:
        - Set "id" as sequential integers from 1 to ${numQuestions} with no gaps, duplicates, or reordering.
        - Do NOT include numbering prefixes in "question" text (e.g., avoid "Q1.", "1)", "Question 1").
      
      **Output Format:** Strictly JSON.
      {
        "title": "String (A short, descriptive title based on the syllabus/content)",
        "questions": [
          {
            "id": Number,
            "type": "mcq",
            "question": "String",
            "options": ["String", "String", "String", "String"],
            "answer": "String (Must exactly match one of the options)",
            "explanation": "String"
          }
        ]
      }
    `;
  } 
  // MODE 2: PAST YEAR PAPER MIMIC
  else if (mode === "past_year") {
    if (!totalMarks || totalMarks <= 0) {
      throw new Error("totalMarks must be provided and greater than 0 for past_year mode.");
    }

    systemPrompt = `
      You are an expert university examiner. 
      Your task is to generate a high-quality Mock Exam based on the provided inputs.
      
      **Constraints:**
      - Time Allowed: ${duration}
      - Total Marks Required: ${totalMarks}
      - Language: STRICTLY ENGLISH. All generated text MUST be in English, regardless of the language of the source material or past year paper.
      - User Custom Instructions: "${customPrompt || "None"}"
      - Past Year Paper Template: ${hasPastYearTemplate ? "Use the provided past year paper as a strict template for question types, sections, and overall structure. Do NOT deviate from this format." : "No past year template is provided; design a sensible exam structure (sections and question mix) aligned with the provided prompt/source context."}
      
      **Instructions:**
      1. ${hasPastYearTemplate ? "Analyze the 'PAST YEAR PAPER FORMAT' to understand the structure (e.g., Section A: MCQs, Section B: Short Answer, Section C: Essay)." : "Design a clear section structure (e.g., MCQ + structured sections) that fits the requested total marks and duration."}
      2. Generate NEW questions based on the provided source material and user prompt.
      3. For 'mcq' types, provide options, the exact answer, and a concise explanation for why that option is correct.
      4. For 'structured' or 'essay' types, provide an 'answer_key' or grading rubric instead of options.
      5. Every question MUST include an integer 'marks' field.
      6. The sum of all question marks MUST equal exactly ${totalMarks}. No more, no less.
      7. Generate a professional and descriptive title for this Mock Exam based on the source material's subject matter.
      8. Numbering rules are strict:
        - Set "id" as sequential integers starting from 1 with no gaps, duplicates, or reordering.
        - Do NOT include numbering prefixes in "question" text (e.g., avoid "Q1.", "1)", "Question 1").
      
      **Output Format:** Strictly JSON.
      {
        "title": "String (A short, descriptive Mock Exam title based on the source material)",
        "duration": "${duration}",
        "totalMarks": ${totalMarks},
        "questions": [
          {
            "id": Number,
            "section": "String (e.g., 'Section A: Multiple Choice')",
            "type": "mcq" | "structured",
            "question": "String",
            "marks": Number,
            "options": ["String", "String", "String", "String"] | null,
            "answer_key": "String (Exact option for MCQ, or detailed bullet-point answer key for structured)",
            "explanation": "String (Required for MCQ: why the answer_key is correct; optional for structured)"
          }
        ]
      }
    `;
  } else {
    throw new Error("Invalid mode. Use 'mcq' or 'past_year'.");
  }

  // Prepare the content for Gemini
  const finalPrompt =
    mode === "past_year"
      ? `${systemPrompt}\n\n=== SOURCE MATERIAL ===\n${combinedSource}\n\n=== PAST YEAR PAPER FORMAT ===\n${pastYearText?.join("\n\n") || ""}`
      : `${systemPrompt}\n\n=== SOURCE MATERIAL ===\n${combinedSource}`;

  // Call Gemini
  const result = await reasoningModel.generateContent({
    contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
  });

  let responseText = result.response.text();
  responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

  const aiQuiz = JSON.parse(responseText) as AIGeneratedQuiz;

  if (mode === "past_year") {
    const generatedTotalMarks = aiQuiz.questions.reduce((sum, question) => {
      const marks = "marks" in question ? Number((question as { marks?: unknown }).marks) : NaN;
      return Number.isFinite(marks) && marks > 0 ? sum + marks : sum;
    }, 0);

    if (!totalMarks || generatedTotalMarks !== totalMarks) {
      throw new Error(
        `Generated past year paper marks mismatch. Expected total ${totalMarks}, got ${generatedTotalMarks}.`
      );
    }
  }

  return aiQuiz;
}
