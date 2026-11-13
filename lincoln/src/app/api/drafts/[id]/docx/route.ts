import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { currentUser } from "@/lib/session";
import { draftById } from "@/lib/queries";
import type { LetterContent } from "@/lib/letter";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await currentUser();
  if (!s) return new Response("Sign in first", { status: 401 });
  const { id } = await params;
  const dr = draftById(s.firm.id, id);
  if (!dr) return new Response("Not found", { status: 404 });
  const L = JSON.parse(dr.content) as LetterContent;
  const font = "Times New Roman";
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: dr.title, font, size: 32, bold: true })] }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "[Attorney: draft prepared by Lincoln for your review. Citations are to the client file by document and page. Notes for you are in square brackets and must be removed before filing.]", font, size: 20, italics: true })] }),
  ];
  for (const sec of L.sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 80 }, children: [new TextRun({ text: sec.cite ? `${sec.heading}: ${sec.cite}` : sec.heading, font, size: 26, bold: true })] }));
    for (const p of sec.paras) {
      children.push(new Paragraph({
        spacing: { after: 160, line: 320 },
        children: p.map((g) =>
          g.k === "note" ? new TextRun({ text: ` [Attorney: ${g.t.trim()}]`, font, size: 22, italics: true, color: "A8322A" })
          : new TextRun({ text: g.k === "fact" && g.doc ? `${g.t} (${g.doc}, client file p. ${g.page})` : g.t, font, size: 24 })),
      }));
    }
  }
  const buf = await Packer.toBuffer(new Document({ sections: [{ children }] }));
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="Halasz_support_letter_v${dr.version}.docx"` } });
}
