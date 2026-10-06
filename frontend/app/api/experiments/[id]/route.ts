import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: { dataset: true }
    });

    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    if (experiment.dataset.userId !== payload.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cascading delete using a Prisma Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete Prediction Logs (linked via Deployment -> Model -> Experiment)
      await tx.predictionLog.deleteMany({
        where: { deployment: { model: { experimentId: id } } }
      });

      // 2. Delete Deployments (linked via Model -> Experiment)
      await tx.deployment.deleteMany({
        where: { model: { experimentId: id } }
      });

      // 3. Delete Models
      await tx.model.deleteMany({
        where: { experimentId: id }
      });

      // 4. Delete the Experiment itself
      await tx.experiment.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Experiment deletion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
