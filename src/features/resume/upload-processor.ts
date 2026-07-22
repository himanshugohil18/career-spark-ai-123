import { supabase } from "@/integrations/supabase/client";
import { processResume, getNextResumeVersion } from "@/lib/resume.functions";

export const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type ResumeValidationError =
  | "unsupported_type"
  | "too_large"
  | "empty_file";

export function validateResumeFile(file: File): ResumeValidationError | null {
  if (file.size <= 0) return "empty_file";
  if (file.size > MAX_SIZE) return "too_large";
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const looksSupported =
    ACCEPTED_MIME.has(file.type) || ext === "pdf" || ext === "docx";
  if (!looksSupported) return "unsupported_type";
  return null;
}

export type UploadPhase =
  | "validating"
  | "uploading"
  | "extracting"
  | "analyzing"
  | "review"
  | "done";

export type UploadCallbacks = {
  onPhase?: (phase: UploadPhase) => void;
  onProgress?: (bytesUploaded: number, total: number) => void;
};

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value ?? "").trim();
}

/**
 * Extract verbatim text from a PDF client-side using pdf.js. Groups runs
 * by rounded Y-coordinate so wrapped lines stay together and preserves
 * reading order so URLs / dates align with the visual layout.
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Disable worker for a one-shot main-thread parse — bundling the pdf.js
  // worker via Vite is fragile and unnecessary here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = "";
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const rows = new Map<number, Array<{ x: number; s: string }>>();
    for (const raw of tc.items as Array<{ str: string; transform: number[] }>) {
      const s = raw.str;
      if (!s) continue;
      const y = Math.round((raw.transform?.[5] ?? 0) * 2) / 2;
      const x = raw.transform?.[4] ?? 0;
      const row = rows.get(y) ?? [];
      row.push({ x, s });
      rows.set(y, row);
    }
    const ordered = [...rows.entries()].sort((a, b) => b[0] - a[0]);
    const lines = ordered.map(([, items]) =>
      items.sort((a, b) => a.x - b.x).map((i) => i.s).join(" ").replace(/[ \t]+/g, " ").trim(),
    );
    pages.push(lines.filter(Boolean).join("\n"));
  }
  return pages.join("\n\n").trim();
}

/**
 * Full upload pipeline: validate → upload to private storage →
 * insert resume row → invoke Gemini processing.
 */
export async function uploadAndProcessResume(
  file: File,
  cb: UploadCallbacks = {},
): Promise<{ resumeId: string; version: number }> {
  cb.onPhase?.("validating");
  const err = validateResumeFile(file);
  if (err) {
    throw new Error(
      err === "too_large"
        ? "Resume must be under 10 MB."
        : err === "empty_file"
          ? "That file is empty."
          : "Only PDF and DOCX resumes are supported.",
    );
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("You must be signed in.");
  const userId = userData.user.id;

  const { nextVersion } = await getNextResumeVersion();
  const ext = file.name.toLowerCase().endsWith(".docx") ? "docx" : "pdf";
  const isDocx = ext === "docx";
  const filePath = `${userId}/v${nextVersion}-${Date.now()}.${ext}`;

  let extractedText: string | undefined;
  if (isDocx) {
    cb.onPhase?.("extracting");
    try {
      extractedText = await extractDocxText(file);
    } catch {
      throw new Error("Could not read this DOCX file. Try exporting as PDF.");
    }
    if (!extractedText || extractedText.length < 20) {
      throw new Error("This resume appears empty or unreadable.");
    }
  }

  cb.onPhase?.("uploading");
  cb.onProgress?.(0, file.size);
  const { error: upErr } = await supabase.storage
    .from("resumes")
    .upload(filePath, file, {
      contentType: file.type || (isDocx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf"),
      cacheControl: "3600",
      upsert: false,
    });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  cb.onProgress?.(file.size, file.size);

  const { data: inserted, error: insErr } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      version: nextVersion,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || (isDocx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf"),
      status: "uploaded",
      is_active: false,
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    await supabase.storage.from("resumes").remove([filePath]).catch(() => undefined);
    throw new Error(`Could not save resume: ${insErr?.message ?? "unknown"}`);
  }

  cb.onPhase?.("analyzing");
  try {
    await processResume({ data: { resumeId: inserted.id, extractedText } });
  } catch (e) {
    throw e instanceof Error ? e : new Error("AI processing failed.");
  }

  cb.onPhase?.("review");
  return { resumeId: inserted.id, version: nextVersion };
}
