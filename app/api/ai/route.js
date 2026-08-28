import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    console.log("--> 1. AI Route Hit (Using New GenAI SDK)");
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing API Key in .env.local");
    }

    const body = await request.json();
    console.log("--> 2. Received Prompt:", body.prompt);

    // Initialize the new SDK
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // The strict prompt to enforce JSON output
    const promptConfig = `
      You are a task scheduling assistant. The current date is ${body.currentDate}.
      Extract the task details from the prompt.
      
      Required JSON schema:
      {
        "description": "Clear task description",
        "date": "YYYY-MM-DD",
        "start_h": <integer 0-23>,
        "start_m": <integer 0-59>,
        "end_h": <integer 0-23>,
        "end_m": <integer 0-59>,
        "priority": "P1, P2, or P3"
      }
      
      Rules:
      - Return ONLY a raw JSON object. Do not include markdown tags like \`\`\`json.
      - Default priority is "P3"
      - Default date is today
      - Default time is start 09:00, end 10:00
      
      Prompt: "${body.prompt}"
    `;

    console.log("--> 3. Asking Gemini 3.7 Flash...");
    
    // Using your exact connection method
    const interaction = await ai.interactions.create({
      model: "gemini-3.7-flash",
      input: promptConfig,
    });
    
    // The new SDK stores the response in output_text
    const aiResponseText = interaction.output_text.trim();
    console.log("--> 4. Raw Gemini Response:", aiResponseText);

    // BULLETPROOF REGEX: Grabs everything from the first '{' to the last '}'
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
        throw new Error("AI did not return a valid JSON object.");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    
    console.log("--> 5. Success! Sending to C++");
    return NextResponse.json({ success: true, data: parsedData }, { status: 200 });

  } catch (error) {
    console.error("--> [CRASH] AI Route Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}