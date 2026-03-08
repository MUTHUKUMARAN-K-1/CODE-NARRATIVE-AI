import React from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../api/client.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Card, CardHeader, CardTitle, CardBody } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";
import { Skeleton } from "./ui/Skeleton.jsx";

const SUGGESTED = [
  "Where is the authentication logic?",
  "How does data flow from API to database?",
  "What does the main entry point do?",
  "Which files should I read first?",
  "Explain the project architecture.",
  "What design patterns are used?",
];

function SmartQA() {
  const { currentRepo, addToast } = useAppContext();
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [lastQuiz, setLastQuiz] = React.useState(null);
  const [quizAnswer, setQuizAnswer] = React.useState(null);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (question) => {
    if (!currentRepo) {
      addToast({ message: "Analyse a repository first to provide context." });
      return;
    }
    if (!question.trim()) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await api.askQuestion({ repoId: currentRepo.id, question });
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: res?.answer ?? res?.content ?? "No answer returned.",
        referenced_files: res?.referenced_files ?? [],
        follow_up_questions: res?.follow_up_questions ?? [],
        quiz: res?.quiz ?? null,
      }]);
      if (res?.quiz) setLastQuiz(res.quiz);
    } catch (err) {
      addToast({ message: `Q&A failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cn-accent/10">
          <span className="material-symbols-outlined text-cn-accent" style={{ fontSize: 22 }}>chat</span>
        </div>
        <div>
          <h1 className="page-title">Smart Q&amp;A</h1>
          <p className="page-desc">Ask anything about your codebase in plain English.</p>
        </div>
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <Card>
          <CardBody>
            <p className="text-xs font-semibold text-cn-muted uppercase tracking-wide mb-3">Suggested Questions</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUGGESTED.map((q) => (
                <button key={q} type="button" onClick={() => ask(q)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-cn-border bg-cn-surface-elevated hover:border-cn-accent/40 hover:bg-cn-accent/5 text-left text-xs text-cn-text transition-all group">
                  <span className="material-symbols-outlined text-cn-muted group-hover:text-cn-accent text-sm shrink-0" style={{ fontSize: 16 }}>lightbulb</span>
                  {q}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Conversation + Quiz layout */}
      <div className="grid lg:grid-cols-[1fr,320px] gap-4 items-start">

        {/* Chat */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])}
                className="text-xs text-cn-muted hover:text-cn-danger transition-colors">Clear</button>
            )}
          </CardHeader>
          <CardBody className="flex flex-col gap-3 max-h-[32rem] overflow-y-auto min-h-[200px]">
            {messages.length === 0 && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-cn-muted mb-3" style={{ fontSize: 40 }}>chat_bubble_outline</span>
                <p className="text-sm text-cn-muted">Select a suggested question or type below.</p>
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-cn-accent text-white rounded-tr-sm"
                    : "bg-cn-surface-elevated border border-cn-border rounded-tl-sm text-cn-text"
                }`}>
                  {m.role === "assistant" ? (
                    <>
                      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                        {m.content}
                      </ReactMarkdown>
                      {m.referenced_files?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-cn-border">
                          <p className="text-[10px] font-semibold text-cn-muted mb-1 uppercase tracking-wide">Referenced Files</p>
                          {m.referenced_files.map((f) => (
                            <div key={f.file_path} className="font-mono text-[10px] text-cn-accent">
                              {f.file_path} {f.relevant_lines && `· L${f.relevant_lines}`}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.follow_up_questions?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {m.follow_up_questions.map((fq) => (
                            <button key={fq} type="button" onClick={() => ask(fq)}
                              className="px-2 py-0.5 rounded-md bg-cn-bg border border-cn-border text-[10px] text-cn-text hover:border-cn-accent/50 transition-colors">
                              {fq}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1.5 text-cn-muted text-xs">
                <span className="w-2 h-2 rounded-full bg-cn-muted animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-cn-muted animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-cn-muted animate-bounce [animation-delay:300ms]" />
                <span className="ml-1">DeepSeek is thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </CardBody>

          {/* Input bar */}
          <div className="border-t border-cn-border p-4 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && ask(input)}
              className="input-base flex-1"
              placeholder={currentRepo ? "Ask anything about this repository…" : "Analyse a repo first…"}
              disabled={!currentRepo || loading}
            />
            <Button variant="primary" onClick={() => ask(input)} disabled={loading || !currentRepo || !input.trim()}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            </Button>
          </div>
        </Card>

        {/* Quiz panel */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Quiz</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setQuizAnswer(null)} disabled={!lastQuiz}>
              Retry
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            {!lastQuiz ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-cn-muted mb-2" style={{ fontSize: 36 }}>quiz</span>
                <p className="text-sm text-cn-muted">Ask a question to generate a quiz on the topic.</p>
              </div>
            ) : (
              <>
                <p className="font-semibold text-cn-text text-sm">{lastQuiz.question}</p>
                <div className="space-y-2">
                  {lastQuiz.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isSelected = quizAnswer === letter;
                    const isCorrect = lastQuiz.correct_answer === letter;
                    return (
                      <button key={letter} type="button" onClick={() => setQuizAnswer(letter)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? isCorrect
                              ? "border-cn-success bg-cn-success/10 text-cn-success"
                              : "border-cn-danger bg-cn-danger/10 text-cn-danger"
                            : "border-cn-border hover:border-cn-border-strong hover:bg-cn-surface-elevated text-cn-text"
                        }`}>
                        <span className="font-bold mr-1.5">{letter}.</span> {opt}
                      </button>
                    );
                  })}
                </div>
                {quizAnswer && (
                  <div className={`rounded-xl p-3 text-xs ${
                    quizAnswer === lastQuiz.correct_answer
                      ? "bg-cn-success/10 text-cn-success border border-cn-success/20"
                      : "bg-cn-danger/10 text-cn-danger border border-cn-danger/20"
                  }`}>
                    <p className="font-bold mb-1">{quizAnswer === lastQuiz.correct_answer ? "✓ Correct!" : "✗ Not quite."}</p>
                    <p>{lastQuiz.explanation}</p>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default SmartQA;
