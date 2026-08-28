import { NextResponse } from "next/server";
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic'; 

// 1. HANDLE PREFLIGHT: This satisfies the "Fix Server CORS Headers" requirement from your image
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('todo_database'); 
    
    const allTasks = await db.collection('Tasks').find({}).toArray();
    
    const safeTasks = allTasks.map(task => ({
        ...task,
        _id: task._id.toString(), 
    }));

    const pendingTasks = safeTasks.filter((t) => 
        t.isCompleted !== true && 
        t.completed !== true && 
        t.done !== true && 
        t.status !== "done"
    );
    
    pendingTasks.sort((a, b) => (a.start_time || 0) - (b.start_time || 0));

    // 2. ALLOW ORIGIN: Attaching the headers to the actual data response
    return NextResponse.json(
      { success: true, Tasks: pendingTasks }, 
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error) {
    console.error("PWA API CRASH:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}