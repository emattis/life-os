import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const goalId = searchParams.get("goalId");
  const dueBefore = searchParams.get("dueBefore");

  // Auto-cleanup: delete completed tasks older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  await prisma.task.deleteMany({
    where: {
      status: "completed",
      completedAt: { lt: thirtyDaysAgo },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (priority) where.priority = Number(priority);
  if (goalId) where.goalId = goalId;
  if (dueBefore) where.dueDate = { lte: new Date(dueBefore) };

  // When no status filter, exclude completed (show only active tasks)
  if (!status) {
    where.status = { not: "completed" };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      goal: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
    },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      type: body.type ?? "to_do",
      priority: body.priority ?? 2,
      status: body.status ?? "pending",
      estimatedMins: body.estimatedMins ?? 30,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      goalId: body.goalId ?? null,
      recurring: body.recurring ?? null,
      energyLevel: body.energyLevel ?? "medium",
      tags: body.tags ?? null,
    },
    include: {
      goal: {
        select: { id: true, title: true, category: true },
      },
    },
  });
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...data } = body;

  if (data.dueDate) data.dueDate = new Date(data.dueDate);
  if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
  if (data.dueDate === "") data.dueDate = null;
  if (data.scheduledDate === "") data.scheduledDate = null;

  // Set completedAt when marking as completed
  if (data.status === "completed" && !data.completedAt) {
    data.completedAt = new Date();
  }
  // Clear completedAt when reverting from completed
  if (data.status && data.status !== "completed") {
    data.completedAt = null;
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      goal: {
        select: { id: true, title: true, category: true },
      },
    },
  });
  return NextResponse.json(task);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
