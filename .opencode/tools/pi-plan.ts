import { tool } from "@opencode-ai/plugin"
import path from "path"

export default tool({
  description:
    "Run planning/research via the LOCAL pi harness (llama.cpp thinking model, default qwen3.6:35b). Feeds the topic plus referenced files to pi headless and returns the plan or research summary. Use for decomposing epics, resolving contradictions, or deep analysis where the local reasoning model is being benchmarked. Heavy reasoning happens in pi's own session.",
  args: {
    topic: tool.schema
      .string()
      .describe("The planning question or research topic to delegate to pi."),
    files: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Repo-relative files to attach as context (e.g. docs/epic-2.md, docs/data-model.md).",
      ),
    model: tool.schema
      .string()
      .optional()
      .describe("Model id override (default: qwen3.6:35b). Local models need llama-server loaded."),
    thinking: tool.schema
      .string()
      .optional()
      .describe("Thinking level (default: high)."),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, "pi-plan.sh")
    const flags: string[] = ["--topic", args.topic]
    if (args.files && args.files.length) {
      flags.push("--files", ...args.files)
    }
    if (args.model) flags.push("--model", args.model)
    if (args.thinking) flags.push("--thinking", args.thinking)

    const TIMEOUT_MS = 30 * 60 * 1000
    const cmd = Bun.$`bash ${script} ${flags}`.cwd(context.worktree).nothrow()
    let result: { stdout: Buffer; stderr: Buffer }
    try {
      result = await Promise.race([
        cmd as Promise<{ stdout: Buffer; stderr: Buffer }>,
        new Promise<{ stdout: Buffer; stderr: Buffer }>((_, reject) =>
          setTimeout(
            () => reject(new Error(`pi-plan timed out after ${TIMEOUT_MS}ms`)),
            TIMEOUT_MS,
          ),
        ),
      ])
    } catch (e: any) {
      cmd.catch(() => {})
      return `pi-plan error: ${e?.message ?? String(e)}`
    }

    const out = (result.stdout.toString() + "\n---stderr---\n" + result.stderr.toString()).trim()
    return out.slice(-6000)
  },
})
