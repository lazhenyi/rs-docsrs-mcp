#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import {
  searchCrates,
  fetchCrateHome,
  fetchCrateDoc,
  listCrateModules,
  fetchCrateReadme
} from "./docsrs.js";

const server = new Server(
  {
    name: "docsrs-mcp",
    version: "0.3.3",
    description: "MCP server for docs.rs - Search and fetch Rust crate documentation"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Define tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "docs_rs_search",
        description: "Search for Rust crates on docs.rs by name or keyword",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query - crate name or keyword"
            },
            limit: {
              type: "number",
              description: "Maximum number of results (1-50, default: 10)"
            }
          },
          required: ["query"],
          additionalProperties: false
        }
      },
      {
        name: "docs_rs_crate_home",
        description: "Get crate homepage information from docs.rs",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            crate: {
              type: "string",
              description: "The crate name"
            }
          },
          required: ["crate"],
          additionalProperties: false
        }
      },
      {
        name: "docs_rs_get_doc",
        description: "Get documentation content for a specific path in a crate",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            crate: {
              type: "string",
              description: "The crate name"
            },
            version: {
              type: "string",
              description: "Crate version (default: 'latest')"
            },
            path: {
              type: "string",
              description: "Documentation path (e.g., 'tokio/runtime/index.html')"
            }
          },
          required: ["crate"],
          additionalProperties: false
        }
      },
      {
        name: "docs_rs_list_modules",
        description: "List all modules and items in a crate",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            crate: {
              type: "string",
              description: "The crate name"
            },
            version: {
              type: "string",
              description: "Crate version (default: 'latest')"
            }
          },
          required: ["crate"],
          additionalProperties: false
        }
      },
      {
        name: "docs_rs_get_readme",
        description: "Get crate README and metadata",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            crate: {
              type: "string",
              description: "The crate name"
            },
            version: {
              type: "string",
              description: "Crate version (default: 'latest')"
            }
          },
          required: ["crate"],
          additionalProperties: false
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "docs_rs_search": {
        const { query, limit } = args;
        const list = await searchCrates(query);
        const sliced = list.slice(0, limit ?? 10);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  total: list.length,
                  results: sliced
                },
                null,
                2
              )
            }
          ]
        };
      }
      case "docs_rs_crate_home": {
        const { crate: crateName } = args;
        const info = await fetchCrateHome(crateName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(info, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_doc": {
        const { crate: crateName, version, path } = args;
        const doc = await fetchCrateDoc(crateName, version || "latest", path || "");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(doc, null, 2)
            }
          ]
        };
      }
      case "docs_rs_list_modules": {
        const { crate: crateName, version } = args;
        const modules = await listCrateModules(crateName, version || "latest");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(modules, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_readme": {
        const { crate: crateName, version } = args;
        const readme = await fetchCrateReadme(crateName, version || "latest");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(readme, null, 2)
            }
          ]
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `${name} failed: ${e?.message ?? String(e)}`
        }
      ]
    };
  }
});

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
