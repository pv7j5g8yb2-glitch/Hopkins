"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Composer from "./Composer";

export default function AskBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  return <Composer value={text} onChange={setText} onSend={() => router.push(`/assistant?q=${encodeURIComponent(text.trim())}`)} autoFocus />;
}
