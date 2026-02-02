#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from
  "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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
    version: "0.2.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * Search docs.rs
 */
server.tool(
  "docs_rs_search",
  {
    query: z.string().min(1).describe("crate name or keyword"),
    limit: z.number().int().min(1).max(50).optional()
  },
  async ({ query, limit }) => {
    try {
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
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              "docs_rs_search failed: " +
              (e?.message ?? String(e))
          }
        ]
      };
    }
  }
);

/**
 * Single crate homepage information
 */
server.tool(
  "docs_rs_crate_home",
  {
    crate: z.string().min(1).describe("crate name")
  },
  async ({ crate }) => {
    try {
      const info = await fetchCrateHome(crate);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2)
          }
        ]
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              "docs_rs_crate_home failed: " +
              (e?.message ?? String(e))
          }
        ]
      };
    }
  }
);

/**
 * Get documentation for a specific path in a crate
 */
server.tool(
  "docs_rs_get_doc",
  {
    crate: z.string().min(1).describe("crate name"),
    version: z.string().optional().describe("version (default: 'latest')"),
    path: z.string().optional().describe("documentation path (e.g., 'tokio/runtime/index.html' or 'tokio/runtime/struct.Runtime.html')")
  },
  async ({ crate, version, path }) => {
    try {
      const doc = await fetchCrateDoc(crate, version || "latest", path || "");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(doc, null, 2)
          }
        ]
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              "docs_rs_get_doc failed: " +
              (e?.message ?? String(e))
          }
        ]
      };
    }
  }
);

/**
 * List all modules and items in a crate
 */
server.tool(
  "docs_rs_list_modules",
  {
    crate: z.string().min(1).describe("crate name"),
    version: z.string().optional().describe("version (default: 'latest')")
  },
  async ({ crate, version }) => {
    try {
      const modules = await listCrateModules(crate, version || "latest");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(modules, null, 2)
          }
        ]
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              "docs_rs_list_modules failed: " +
              (e?.message ?? String(e))
          }
        ]
      };
    }
  }
);

/**
 * Get crate README and metadata
 */
server.tool(
  "docs_rs_get_readme",
  {
    crate: z.string().min(1).describe("crate name"),
    version: z.string().optional().describe("version (default: 'latest')")
  },
  async ({ crate, version }) => {
    try {
      const readme = await fetchCrateReadme(crate, version || "latest");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(readme, null, 2)
          }
        ]
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              "docs_rs_get_readme failed: " +
              (e?.message ?? String(e))
          }
        ]
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
