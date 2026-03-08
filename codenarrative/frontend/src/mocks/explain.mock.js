export default function explainMock() {
  return Promise.resolve({
    beginner: {
      explanation:
        "This function adds two numbers together and gives you the result. It's like putting two stacks of blocks into a single stack.",
      analogy: "Think of it as combining two piles of coins into one bigger pile.",
      key_takeaway: "The function is simple: take inputs, add them, return the sum."
    },
    intermediate: {
      explanation:
        "The function performs a pure computation by summing its two arguments without side effects.",
      patterns_used: ["pure function"],
      system_role:
        "Used wherever basic arithmetic is needed, often inside higher level business logic.",
      key_takeaway:
        "Its simplicity makes it easy to test and reason about, and it can be reused across the codebase."
    },
    expert: {
      explanation:
        "Although trivial, this function demonstrates encapsulation of a low-level operation that can be swapped or instrumented as needed.",
      design_decisions:
        "Keeping arithmetic in a dedicated helper allows centralizing validation or logging later.",
      tradeoffs:
        "Extra indirection adds a small call overhead, but improves testability in complex domains.",
      potential_issues:
        "If used in performance-critical hot paths, repeated calls could be inlined for efficiency.",
      optimization_tips:
        "If profiling reveals this as a bottleneck, consider inlining or using typed arrays where appropriate."
    }
  });
}

