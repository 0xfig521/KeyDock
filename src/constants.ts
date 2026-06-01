import type { PresetDef, SecretCategory } from "@/types"

// --- Secret form initial state ---

export const emptySecretForm = {
  name: "",
  category: "aI" as SecretCategory,
  baseUrl: "",
  modelName: "",
  tags: "",
  description: "",
  dashboardUrl: "",
}

export const emptyApiKeyForm = {
  name: "",
  value: "",
  envName: "",
  includeByDefault: true,
  tags: "",
}

// --- Quick-start presets (Dashboard) ---

export const presets: PresetDef[] = [
  {
    name: "OpenRouter",
    category: "aI",
    baseUrl: "https://openrouter.ai/api/v1",
    modelName: "anthropic/claude-3.5-sonnet",
    tags: "ai,llm",
    description: "Managed OpenRouter secrets",
    apiKey: { name: "default", env: "OPENAI_API_KEY" },
  },
  {
    name: "DeepSeek",
    category: "aI",
    baseUrl: "https://api.deepseek.com/v1",
    modelName: "deepseek-chat",
    tags: "ai,llm",
    description: "Managed DeepSeek secrets",
    apiKey: { name: "default", env: "DEEPSEEK_API_KEY" },
  },
  {
    name: "Cloudflare",
    category: "cloud",
    baseUrl: "https://api.cloudflare.com/client/v4",
    modelName: "",
    tags: "cloud,cdn",
    description: "Managed Cloudflare secrets",
    apiKey: { name: "default", env: "CLOUDFLARE_API_TOKEN" },
  },
  {
    name: "Tavily",
    category: "search",
    baseUrl: "https://api.tavily.com",
    modelName: "",
    tags: "search",
    description: "Managed Tavily secrets",
    apiKey: { name: "default", env: "TAVILY_API_KEY" },
  },
]

// --- Utility: split "a, b, c" into ["a", "b", "c"] ---

export function splitTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

// --- Utility: derive default env name from a service name ---
// e.g. "open router!" -> "OPEN_ROUTER_API_KEY"

export function defaultEnvNameForSecret(serviceName: string): string {
  return (
    serviceName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") + "_API_KEY"
  )
}

// --- Utility: kebab-case for workspace names ---

export function normalizeWorkspaceName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_-]/g, "")
}
