export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function llmModel(): string {
  return process.env.LLM_MODEL ?? "muse-spark-contributor";
}
