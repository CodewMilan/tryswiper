import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createSwiperServer } from "./server";

async function main() {
  const server = createSwiperServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Swiper MCP server running on stdio");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
