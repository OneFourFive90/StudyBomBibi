import { generateContent } from "../gemini";

interface ExplainTextParams {
  highlightedText: string;
  context: string;
  action: "explain" | "summarise";
}

export async function quickExplainText({ highlightedText, context, action }: ExplainTextParams): Promise<string> {
  let prompt = "";
  
  if (action === "summarise") {
    prompt = `
      You are an expert academic tutor. The student is reading the following study notes:
      ---
      ${context}
      ---
      The student highlighted the following section: "${highlightedText}".
      
      Provide a concise summary of the highlighted section. Focus on the key points.
      Keep the summary brief and clear.
    `;
  } else {
    prompt = `
      You are an expert academic tutor. The student is reading the following study notes:
      ---
      ${context}
      ---
      The student highlighted the word/phrase: "${highlightedText}".
      
      Provide a brief, easily understandable explanation of this word strictly based on how it is used in the context of the notes provided above. 
      Keep the explanation to 2 or 3 short sentences.
    `;
  }

  const response = await generateContent(prompt);
  return response;
}
