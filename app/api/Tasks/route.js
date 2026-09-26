import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// 1. GET: Fetch all Tasks
export async function GET(request) { // FIX: Added the missing 'request' parameter here
  try {
    // 1. Extract Identity Headers
    const username = request.headers.get('x-username');
    const password = request.headers.get('x-app-password');

    // 2. The Gatekeeper: Verify the Master Password
    if (password !== process.env.APP_PASSWORD) {
      console.error("Unauthorized access attempt rejected.");
      return NextResponse.json({ error: "Unauthorized: Invalid App Password" }, { status: 401 });
    }

    // 3. The Router: Enforce Username Requirement
    if (!username) {
      return NextResponse.json({ error: "Bad Request: Username required" }, { status: 400 });
    }

    // 4. Database Fetch: Filter strictly by Username
    const client = await clientPromise;
    const db = client.db('todo_database');
    const Tasks = await db.collection('Tasks').find({ user: username }).toArray();

    return NextResponse.json({ success: true, data: Tasks }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. POST: Add a new task
export async function POST(request) {
  try {
    // 1. Extract Identity Headers
    const username = request.headers.get('x-username');
    const password = request.headers.get('x-app-password');

    // 2. The Gatekeeper: Verify the Master Password
    if (password !== process.env.APP_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized: Invalid App Password" }, { status: 401 });
    }

    if (!username) {
      return NextResponse.json({ error: "Bad Request: Username required" }, { status: 400 });
    }

    // 3. Read the incoming task data
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db('todo_database');

    const newTask = {
      id: body.id,
      user: username,
      description: body.description || '',
      priority: body.priority || 'P3',
      date: body.date || '',
      start_time: body.start_time || 0,
      end_time: body.end_time || 0,
      isCompleted: body.isCompleted || false,
      createdAt: new Date()
    };

    const result = await db.collection('Tasks').insertOne(newTask);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. PUT: Optimized Partial Update (Delta Sync)
export async function PUT(request) {
  try {
    // SECURITY UPGRADE: Validate headers on edits
    const username = request.headers.get('x-username');
    const password = request.headers.get('x-app-password');

    if (password !== process.env.APP_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized: Invalid App Password" }, { status: 401 });
    }
    if (!username) {
      return NextResponse.json({ error: "Bad Request: Username required" }, { status: 400 });
    }

    const body = await request.json();
    const client = await clientPromise;
    const db = client.db('todo_database');

    // 1. Strict ID Extraction
    const taskId = Number(body.id);
    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: "Invalid ID provided" }, { status: 400 });
    }

    // 2. Dynamic Update Builder (Only update what was actually sent)
    const updateData = {};
    if ('description' in body) updateData.description = String(body.description);
    if ('priority' in body) updateData.priority = String(body.priority);
    if ('date' in body) updateData.date = String(body.date);
    if ('start_time' in body) updateData.start_time = Number(body.start_time);
    if ('end_time' in body) updateData.end_time = Number(body.end_time);
    if ('isCompleted' in body) updateData.isCompleted = Boolean(body.isCompleted); // Forces pure true/false

    // If C++ sent an ID but no fields to update, abort safely.
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    // 3. The Query: Ensure we only update the task IF it belongs to the active user
    const result = await db.collection('Tasks').updateOne(
      { 
        $and: [
          { $or: [{ id: taskId }, { id: String(taskId) }] },
          { user: username } // Strict ownership filter
        ]
      }, 
      { $set: updateData }
    );

    return NextResponse.json({ success: true, matched: result.matchedCount }, { status: 200 });
  } catch (error) {
    console.error("PUT Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. DELETE: Remove a task
export async function DELETE(request) {
  try {
    // SECURITY UPGRADE: Validate headers on deletion
    const username = request.headers.get('x-username');
    const password = request.headers.get('x-app-password');

    if (password !== process.env.APP_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized: Invalid App Password" }, { status: 401 });
    }
    if (!username) {
      return NextResponse.json({ error: "Bad Request: Username required" }, { status: 400 });
    }

    // Extract the ID from the URL (e.g., /api/Tasks?id=5)
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));

    const client = await clientPromise;
    const db = client.db('todo_database');

    // Strict ownership: Task is only deleted if the ID matches AND it belongs to the active user
    const result = await db.collection('Tasks').deleteOne({ id: id, user: username });
    
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}