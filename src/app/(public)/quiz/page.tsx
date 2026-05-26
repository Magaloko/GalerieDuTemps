import { QuizClient } from "./quiz-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Какой у вас винтажный характер? — Galerie du Temps",
  description: "Персональный тест: 5 вопросов, 1 минута, ваш уникальный профиль и подборка.",
};

export default function QuizPage() {
  return (
    <div
      className="min-h-[calc(100vh-5rem)]"
      style={{ background: "var(--color-cobalt)" }}
    >
      <QuizClient />
    </div>
  );
}
