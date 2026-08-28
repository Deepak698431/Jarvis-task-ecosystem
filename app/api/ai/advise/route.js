import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import clientPromise from '@/lib/mongodb';

export async function POST(request) {
  console.log("\n--> [Advisor API] 1. Request Received");
  
  try {
    const body = await request.json();
    const todayDate = body.date; 
    const currentTime = body.time; 
    console.log(`--> [Advisor API] Date: ${todayDate}, Time: ${currentTime}`);

    const client = await clientPromise;
    const db = client.db('todo_database');
    
    console.log("--> [Advisor API] 2. Fetching Tasks from MongoDB...");
    
    // FIX: Use $ne: true (Not Equal to True) to catch missing, null, or false fields!
    const rawTasks = await db.collection('Tasks')
      .find({ isCompleted: { $ne: true } }) 
      .sort({ start_time: 1 }) 
      .limit(8)
      .toArray();

    console.log(`--> [Advisor API] Found ${rawTasks.length} pending Tasks.`);

    if (rawTasks.length === 0) {
      return NextResponse.json({ 
          success: true, 
          advice: "Your entire schedule is clear! Enjoy your free time or plan ahead." 
      }, { status: 200 });
    }

    const simplifiedTasks = rawTasks.map(t => {
      const dStart = t.start_time ? new Date(t.start_time * 1000) : new Date();
      return {
        date: t.date, 
        description: t.description,
        priority: t.priority || "P3",
        start_time: `${dStart.getHours()}:${dStart.getMinutes().toString().padStart(2, '0')}`
      };
    });

    console.log("--> [Advisor API] 3. Asking Gemini 3.7 Flash...");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const promptConfig = `
      You are an elite software engineering productivity coach. 
      The user is an undergraduate computer science student named Deepak.
      Today is ${todayDate} and the current time is ${currentTime}.
      
      Here is the timeline of his upcoming pending Tasks:
      ${JSON.stringify(simplifiedTasks)}
      
      RULES:
      1. Analyze the dates and times. If a task is scheduled for today and past due, urge him to start immediately.
      2. If it is late at night and the next task is tomorrow, explicitly tell him he is done for the day and should rest.
      3. Factor in cognitive load. Prioritize heavy C++ systems Tasks over lighter web dev Tasks.
      4. Reply with EXACTLY two sentences.
      5. Be direct, professional, and motivating. No markdown.
    `;

    const interaction = await ai.interactions.create({
      model: "gemini-3.7-flash",
      input: promptConfig,
    });

    let aiAdvice = "No advice generated.";
    if (interaction && interaction.output_text) {
       aiAdvice = interaction.output_text.trim();
    } 

    console.log("--> [Advisor API] 4. Success! Sending this to C++ UI:\n", aiAdvice);
    return NextResponse.json({ success: true, advice: aiAdvice }, { status: 200 });

  } catch (error) {
    console.error("\n--> [CRASH] Advisor Error:", error);
    
    if (error.message && (error.message.includes("429") || error.message.includes("quota"))) {
        return NextResponse.json({ success: false, error: "AI Rate Limit Reached." }, { status: 429 });
    }
    return NextResponse.json({ success: false, error: "AI Server Error." }, { status: 500 });
  }
}