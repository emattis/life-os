import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const where: Record<string, string> = {};
  if (status) where.status = status;
  if (category) where.category = category;

  const goals = await prisma.goal.findMany({
    where,
    include: {
      tasks: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  // Attach task progress to each goal
  const goalsWithProgress = goals.map((goal) => {
    const totalTasks = goal.tasks.length;
    const completedTasks = goal.tasks.filter(
      (t) => t.status === "completed"
    ).length;
    return {
      ...goal,
      totalTasks,
      completedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  });

  return NextResponse.json(goalsWithProgress);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const goal = await prisma.goal.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      category: body.category,
      priority: body.priority ?? 1,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      status: body.status ?? "active",
    },
  });
  return NextResponse.json(goal, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...data } = body;
  if (data.targetDate) data.targetDate = new Date(data.targetDate);
  const goal = await prisma.goal.update({
    where: { id },
    data,
  });
  return NextResponse.json(goal);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
