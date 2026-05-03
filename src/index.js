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
  fetchCrateReadme,
  listCrateVersions,
  getReverseDependencies,
  getCrateDownloads,
  searchCrateItems,
  getCrateSourceLink,
  getCrateFeatures,
  getCrateDependencies,
  getCrateOwners,
  searchRustDoc,
  getCrateReleases,
  getTraitImplementations,
  getItemSourceCode,
  getCrateKeywords,
  getCrateLicense,
  compareCrateVersions
} from "./docsrs.js";

const server = new Server(
  {
    name: "docsrs-mcp",
    version: "0.4.0",
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
      },
      {
        name: "docs_rs_list_versions",
        description: "List all available versions of a crate",
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
        name: "docs_rs_get_reverse_deps",
        description: "Get reverse dependencies (which crates depend on this crate)",
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
        name: "docs_rs_get_downloads",
        description: "Get download statistics for a crate from crates.io",
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
        name: "docs_rs_search_items",
        description: "Search for specific item types (traits, structs, functions, etc.) within a crate",
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
            item_type: {
              type: "string",
              description: "Item type to search for: mod, struct, enum, fn, trait, macro, type, constant"
            }
          },
          required: ["crate"],
          additionalProperties: false
        }
      },
      {
        name: "docs_rs_get_source_link",
        description: "Get source code link and repository information for a crate",
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
        name: "docs_rs_get_features",
        description: "Get crate features and configuration options",
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
        name: "docs_rs_get_dependencies",
        description: "Get direct dependencies of a crate",
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
        name: "docs_rs_get_owners",
        description: "Get crate owners and maintainers from crates.io",
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
        name: "docs_rs_search_rustdoc",
        description: "Search rustdoc across crates for a symbol or type",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for symbol or type"
            },
            limit: {
              type: "number",
              description: "Maximum results (default: 10)"
            }
          },
          required: ["query"],
          additionalProperties: false
        }
      },
      {
        name: "docs_rs_get_releases",
        description: "Get crate release history with dates",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            crate: {
              type: "string",
              description: "The crate name"
            },
            limit: {
              type: "number",
              description: "Maximum releases to return (default: 20)"
            }
          },
          required: ["crate"],
          additionalProperties: false
        }
      },
      {
        name: "docs_rs_get_trait_impls",
        description: "Find all implementations of a trait in a crate",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            crate: {
              type: "string",
              description: "The crate name"
            },
            trait_name: {
              type: "string",
              description: "Name of the trait to search for"
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
        name: "docs_rs_get_source_code",
        description: "Get source code for a specific item",
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
              description: "Documentation path to the item"
            }
          },
          required: ["crate", "path"],
          additionalProperties: false
        }
      },
      {
        name: "docs_rs_get_keywords",
        description: "Get crate keywords and categories from crates.io",
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
        name: "docs_rs_get_license",
        description: "Get crate license information",
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
        name: "docs_rs_compare_versions",
        description: "Compare two versions of a crate",
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            crate: {
              type: "string",
              description: "The crate name"
            },
            version1: {
              type: "string",
              description: "First version to compare"
            },
            version2: {
              type: "string",
              description: "Second version to compare"
            }
          },
          required: ["crate", "version1", "version2"],
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
      case "docs_rs_list_versions": {
        const { crate: crateName } = args;
        const versions = await listCrateVersions(crateName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(versions, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_reverse_deps": {
        const { crate: crateName } = args;
        const deps = await getReverseDependencies(crateName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(deps, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_downloads": {
        const { crate: crateName } = args;
        const downloads = await getCrateDownloads(crateName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(downloads, null, 2)
            }
          ]
        };
      }
      case "docs_rs_search_items": {
        const { crate: crateName, version, item_type } = args;
        const items = await searchCrateItems(crateName, version || "latest", item_type);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(items, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_source_link": {
        const { crate: crateName, version } = args;
        const source = await getCrateSourceLink(crateName, version || "latest");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(source, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_features": {
        const { crate: crateName, version } = args;
        const features = await getCrateFeatures(crateName, version || "latest");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(features, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_dependencies": {
        const { crate: crateName, version } = args;
        const deps = await getCrateDependencies(crateName, version || "latest");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(deps, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_owners": {
        const { crate: crateName } = args;
        const owners = await getCrateOwners(crateName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(owners, null, 2)
            }
          ]
        };
      }
      case "docs_rs_search_rustdoc": {
        const { query, limit } = args;
        const results = await searchRustDoc(query, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_releases": {
        const { crate: crateName, limit } = args;
        const releases = await getCrateReleases(crateName, limit || 20);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(releases, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_trait_impls": {
        const { crate: crateName, trait_name, version } = args;
        const impls = await getTraitImplementations(crateName, trait_name, version || "latest");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(impls, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_source_code": {
        const { crate: crateName, version, path } = args;
        const source = await getItemSourceCode(crateName, version || "latest", path);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(source, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_keywords": {
        const { crate: crateName } = args;
        const keywords = await getCrateKeywords(crateName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(keywords, null, 2)
            }
          ]
        };
      }
      case "docs_rs_get_license": {
        const { crate: crateName } = args;
        const license = await getCrateLicense(crateName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(license, null, 2)
            }
          ]
        };
      }
      case "docs_rs_compare_versions": {
        const { crate: crateName, version1, version2 } = args;
        const comparison = await compareCrateVersions(crateName, version1, version2);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(comparison, null, 2)
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
