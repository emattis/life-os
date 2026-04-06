import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const blocks = await prisma.dailyBlock.findMany({
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(blocks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const block = await prisma.dailyBlock.create({
    data: {
      name: body.name,
      startTime: body.startTime,
      endTime: body.endTime,
      days: body.days ?? "mon,tue,wed,thu,fri,sat,sun",
      category: body.category,
      flexible: body.flexible ?? false,
      color: body.color ?? "#6366f1",
    },
  });
  return NextResponse.json(block, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...data } = body;
  const block = await prisma.dailyBlock.update({
    where: { id },
    data,
  });
  return NextResponse.json(block);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.dailyBlock.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
