export const AGENT_CLIENTS = {
  cursor: {
    title: "Cursor",
    requirement: "Use Cursor on your computer. You can connect to a local Swiper server or a public Swiper address.",
    steps: [
      "Open Connect in Swiper, choose Cursor, and mint a private key. Save it before leaving the page.",
      "Use Add to Cursor, or copy the Cursor config into your MCP settings (.cursor/mcp.json for a project). Keep private configs out of shared repositories.",
      "Enable Swiper in Cursor’s MCP tools. Start a conversation and use the first prompt below. Review tool requests before approving them.",
    ],
    troubleshooting: "If Swiper is unavailable, check that the server is running, the config uses the correct address, and the key has not been revoked. Restart or refresh the client after changing its config.",
    docs: "https://cursor.com/docs/mcp",
  },
  claude: {
    title: "Claude",
    requirement: "Claude’s hosted connector needs a public HTTPS Swiper address and a Claude plan/workspace that permits custom connectors. Claude Code can also connect locally.",
    steps: [
      "Open Connect in Swiper, choose Claude, and mint a private key. Save it before leaving the page.",
      "In Claude’s Customize → Connectors, add a custom connector. Use the server URL from Swiper, select No sign in, and add an Authorization request header with the Bearer value shown in your private config.",
      "Enable the connector in your conversation and paste the first prompt below. For Claude Code, use the separate command in Swiper’s Claude setup tab. Team workspaces may require an owner to add the connector first.",
    ],
    troubleshooting: "A hosted connector cannot reach your laptop’s localhost address. Use a public HTTPS deployment. Check workspace connector permissions, the Authorization header and whether your key is still active.",
    docs: "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
  },
  chatgpt: {
    title: "ChatGPT",
    requirement: "Use a public HTTPS Swiper address. Your ChatGPT account/workspace must allow custom MCP plugins or apps; availability and labels depend on your account.",
    steps: [
      "Open Connect in Swiper, choose ChatGPT, and mint a private key. Copy the private ChatGPT URL from that tab.",
      "In ChatGPT’s Plugins, choose Add custom MCP server (or your account’s custom MCP app flow). Enter the private server URL and choose No authentication when asked.",
      "Finish creating and installing the plugin, then select it in your conversation. Paste the first prompt below and review any requested tool approvals.",
    ],
    troubleshooting: "Check that the plugin is installed and selected in the conversation, custom MCP is allowed in your workspace, and Swiper is publicly reachable over HTTPS. If you lose the URL, mint a new key and revoke the old one.",
    docs: "https://developers.openai.com/api/docs/guides/custom-mcp-server",
  },
} as const;

export type AgentClient = keyof typeof AGENT_CLIENTS;
export function agentClient(value: string | null | undefined): AgentClient {
  return value === "claude" || value === "chatgpt" ? value : "cursor";
}
export const FIRST_PROMPT = "Use Swiper to read my brand kit and create a carousel explaining the main problem my product solves. Choose a suitable story format, write clear original copy, run quality checks, and give me the editor link to review it.";
