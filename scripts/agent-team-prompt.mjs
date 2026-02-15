#!/usr/bin/env node

const task = process.argv.slice(2).join(" ").trim();

if (!task) {
  console.error('Usage: node scripts/agent-team-prompt.mjs "<task>"');
  process.exit(1);
}

const prompt = [
  "Run a 3-teammate agent workflow for the task below.",
  "",
  `Task: ${task}`,
  "",
  "Teammates:",
  "1. UX Teammate: Focus on developer experience, command ergonomics, output clarity, onboarding, and error feedback.",
  "2. Technical Architecture Teammate: Focus on architecture, parsing/indexing strategy, data model, performance, and testing.",
  "3. Devil's Advocate Teammate: Critique assumptions, identify risks/tradeoffs, and challenge overengineering.",
  "",
  "Required process:",
  "1. Produce each teammate's view independently.",
  "2. List assumptions and confidence for each teammate.",
  "3. Highlight direct disagreements across teammates.",
  "4. Synthesize one practical recommendation.",
  "5. Produce an MVP-first execution backlog with acceptance criteria.",
  "",
  "Output format:",
  "- UX Teammate",
  "- Technical Architecture Teammate",
  "- Devil's Advocate Teammate",
  "- Decision Synthesis",
  "- Execution Backlog",
].join("\n");

console.log(prompt);
