# rs-docsrs-mcp

A Model Context Protocol (MCP) server for [docs.rs](https://docs.rs) - enabling AI assistants to search and fetch Rust crate documentation.

[![CI Tests](https://github.com/lazhenyi/rs-docsrs-mcp/actions/workflows/test.yml/badge.svg)](https://github.com/lazhenyi/rs-docsrs-mcp/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/rs-docsrs-mcp.svg)](https://www.npmjs.com/package/rs-docsrs-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Search Crates**: Search for Rust crates on docs.rs by name or keyword
- 📦 **Crate Information**: Get detailed information about specific crates
- 📚 **Documentation Access**: Fetch documentation for specific modules, structs, functions, and more
- 📑 **Module Listing**: List all modules, structs, enums, functions, traits, and macros in a crate
- 📖 **README Access**: Retrieve crate README and metadata

## Installation

Install globally via npm:

```bash
npm install -g rs-docsrs-mcp
```

Or use with npx:

```bash
npx rs-docsrs-mcp
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docsrs": {
      "command": "npx",
      "args": ["-y", "rs-docsrs-mcp"]
    }
  }
}
```

If installed globally:

```json
{
  "mcpServers": {
    "docsrs": {
      "command": "rs-docsrs-mcp"
    }
  }
}
```

## Available Tools

### 1. `docs_rs_search`

Search for crates on docs.rs.

**Parameters:**
- `query` (string, required): Crate name or keyword to search
- `limit` (number, optional): Maximum number of results (1-50, default: 10)

**Example:**
```json
{
  "query": "tokio",
  "limit": 5
}
```

### 2. `docs_rs_crate_home`

Get homepage information for a specific crate.

**Parameters:**
- `crate` (string, required): Crate name

**Example:**
```json
{
  "crate": "tokio"
}
```

### 3. `docs_rs_get_doc`

Get documentation for a specific path in a crate.

**Parameters:**
- `crate` (string, required): Crate name
- `version` (string, optional): Version (default: "latest")
- `path` (string, optional): Documentation path (e.g., "tokio/runtime/index.html")

**Examples:**
```json
{
  "crate": "tokio",
  "version": "latest",
  "path": "tokio/runtime/struct.Runtime.html"
}
```

```json
{
  "crate": "serde",
  "path": "serde/trait.Serialize.html"
}
```

### 4. `docs_rs_list_modules`

List all modules and items in a crate.

**Parameters:**
- `crate` (string, required): Crate name
- `version` (string, optional): Version (default: "latest")

**Example:**
```json
{
  "crate": "tokio",
  "version": "1.35.0"
}
```

**Returns:**
- `modules`: List of modules with descriptions
- `structs`: List of structs
- `enums`: List of enums
- `functions`: List of functions
- `traits`: List of traits
- `macros`: List of macros

### 5. `docs_rs_get_readme`

Get README and metadata for a crate.

**Parameters:**
- `crate` (string, required): Crate name
- `version` (string, optional): Version (default: "latest")

**Example:**
```json
{
  "crate": "tokio"
}
```

## Example Queries

Once configured, you can ask Claude:

- "Search for HTTP client crates"
- "Show me the tokio runtime documentation"
- "List all modules in the serde crate"
- "Get the README for actix-web"
- "What structs are available in tokio?"

## Development

Clone the repository:

```bash
git clone https://github.com/lazhenyi/rs-docsrs-mcp.git
cd rs-docsrs-mcp
npm install
```

Run locally:

```bash
npm start
```

## Requirements

- Node.js >= 20.0.0

## How It Works

This MCP server scrapes documentation from docs.rs to provide structured information about Rust crates. It uses:

- **cheerio**: For HTML parsing
- **node-fetch**: For HTTP requests
- **@modelcontextprotocol/sdk**: For MCP protocol implementation
- **zod**: For parameter validation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [GitHub Repository](https://github.com/lazhenyi/rs-docsrs-mcp)
- [npm Package](https://www.npmjs.com/package/rs-docsrs-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [docs.rs](https://docs.rs)

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/lazhenyi/rs-docsrs-mcp/issues) on GitHub.
