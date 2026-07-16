import { tool } from "@opencode-ai/plugin"
import path from "path"

export default tool({
  description:
    "Build a FedSpend story via the LOCAL pi harness (llama.cpp). Runs pi-build.sh -> run-story.sh --headless: provisions a worktree, drives pi against the loaded local model, runs verify2.sh --guard, merges on PASS, and appends .research/build-log.json. Returns PASS/FAIL + diffstat. All heavy token consumption happens inside pi's own session — only the summary crosses back. Long-running (minutes to ~1h for large local models).",
  args: {
    storyId: tool.schema
      .string()
      .describe("Story ID from .research/plan.json, e.g. E1-S05"),
    model: tool.schema
      .string()
      .optional()
      .describe(
        "Force a specific model id (e.g. qwen3.6:35b, qwen3-coder:30b, zai-coding-plan/glm-5.2). Omit to use the story's normal tier ladder. Local models require llama-server to be running the matching GGUF.",
      ),
    thinking: tool.schema
      .string()
      .optional()
      .describe(
        "Thinking level: off|minimal|low|medium|high|xhigh. Only meaningful with --model or thinking-capable tiers.",
      ),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, "pi-build.sh")
    const parts: string[] = [args.storyId]
    if (args.model) parts.push(args.model)
    if (args.thinking && args.model) parts.push(args.thinking)

    const TIMEOUT_MS = 60 * 60 * 1000
    const cmd = Bun.$`bash ${script} ${parts}`.cwd(context.worktree).nothrow()
    let result: { stdout: Buffer; stderr: Buffer }
    try {
      result = await Promise.race([
        cmd as Promise<{ stdout: Buffer; stderr: Buffer }>,
        new Promise<{ stdout: Buffer; stderr: Buffer }>((_, reject) =>
          setTimeout(
            () => reject(new Error(`pi-build timed out after ${TIMEOUT_MS}ms`)),
            TIMEOUT_MS,
          ),
        ),
      ])
    } catch (e: any) {
      cmd.catch(() => {})
      return `pi-build error: ${e?.message ?? String(e)}`
    }

    const out = (result.stdout.toString() + "\n---stderr---\n" + result.stderr.toString()).trim()
    return out.slice(-4000)
  },
})
