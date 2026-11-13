import AssistantChat from "@/components/AssistantChat";
import { requireUser } from "@/lib/session";
import { chatHistory } from "@/lib/queries";
import { llmConfigured } from "@/lib/llm";

export default async function Assistant({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { user, firm } = await requireUser();
  const { q = "" } = await searchParams;
  return <AssistantChat initial={chatHistory(firm.id, user.id).map((m) => ({ role: m.role, content: m.content }))} firstName={user.name.split(" ")[0]} q={q.slice(0, 2000)} connected={llmConfigured()} />;
}
