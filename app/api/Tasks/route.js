import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// 1. GET: Fetch all Tasks
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('todo_database');
    const Tasks = await db.collection('Tasks').find({}).toArray();
    return NextResponse.json({ success: true, data: Tasks }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. POST: Add a new task
export async function POST(request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db('todo_database');

    const newTask = {
      id: body.id,
      description: body.description || '',
      priority: body.priority || 'P3',
      date : body.date || '' ,
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

// 3. PUT: Update an existing task (Edits & Checkboxes)
// 3. PUT: Optimized Partial Update (Delta Sync)
export async function PUT(request) {
  try {
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
    if('date' in body) updateData.date = String(body.date);
    if ('start_time' in body) updateData.start_time = Number(body.start_time);
    if ('end_time' in body) updateData.end_time = Number(body.end_time);
    if ('isCompleted' in body) updateData.isCompleted = Boolean(body.isCompleted); // Forces pure true/false

    // If C++ sent an ID but no fields to update, abort safely.
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    // 3. The Query: $or allows us to catch the ID whether Mongo saved it as a String or a Number
    const result = await db.collection('Tasks').updateOne(
      { $or: [{ id: taskId }, { id: String(taskId) }] }, 
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
    // Extract the ID from the URL (e.g., /api/Tasks?id=5)
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));

    const client = await clientPromise;
    const db = client.db('todo_database');

    const result = await db.collection('Tasks').deleteOne({ id: id });
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}