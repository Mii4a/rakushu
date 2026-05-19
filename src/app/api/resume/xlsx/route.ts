import { NextResponse } from "next/server";
import { z } from "zod";

import { buildResumeWorkbookFromTemplate } from "@/lib/resume/xlsx-template.server";

const workbookSchema = z.object({
  templateName: z.string(),
  asOfDate: z.string(),
  fullName: z.string(),
  furigana: z.string(),
  gender: z.string(),
  birthDate: z.string(),
  ageText: z.string(),
  postalCode: z.string(),
  currentAddress: z.string(),
  contactAddress: z.string(),
  phone: z.string(),
  email: z.string(),
  educationRows: z.array(z.tuple([z.string(), z.string().optional(), z.string().optional()])),
  licenseRows: z.array(z.tuple([z.string(), z.string().optional(), z.string().optional()])),
  motivation: z.string(),
  selfPr: z.string(),
  desiredConditions: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = workbookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const bytes = buildResumeWorkbookFromTemplate(parsed.data);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="resume.xlsx"',
    },
  });
}
