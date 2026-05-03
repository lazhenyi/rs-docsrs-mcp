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
- 📋 **Version History**: List all available versions of a crate
- 🔄 **Reverse Dependencies**: Find which crates depend on a specific crate
- 📊 **Download Stats**: Get download statistics from crates.io
- 🎯 **Item Search**: Search for specific item types within a crate
- 🔗 **Source Links**: Get repository and source code links
- ⚙️ **Feature Discovery**: Find crate features and configuration options
- 📦 **Direct Dependencies**: Get all dependencies of a crate
- 👥 **Crate Owners**: Get crate maintainers and owners
- 🦀 **Rustdoc Search**: Search across all crates for a symbol or type
- 📅 **Release History**: Get crate release history with dates
- 🔍 **Trait Implementations**: Find all implementations of a trait
- 💻 **Source Code**: View source code for any item
- 🏷️ **Keywords/Categories**: Get crate keywords and categories
- 📄 **License Info**: Get crate license information
- ⚖️ **Version Comparison**: Compare items between two versions

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

### 6. `docs_rs_list_versions`

List all available versions of a crate.

**Parameters:**
- `crate` (string, required): Crate name

**Example:**
```json
{
  "crate": "tokio"
}
```

**Returns:**
- `versions`: Array of version strings (sorted descending)
- `latest_url`: URL to the latest version docs

### 7. `docs_rs_get_reverse_deps`

Get reverse dependencies (which crates depend on this crate).

**Parameters:**
- `crate` (string, required): Crate name

**Example:**
```json
{
  "crate": "tokio"
}
```

### 8. `docs_rs_get_downloads`

Get download statistics for a crate from crates.io.

**Parameters:**
- `crate` (string, required): Crate name

**Example:**
```json
{
  "crate": "tokio"
}
```

**Returns:**
- `downloads`: Object with `all` (total) and `recent` download counts
- `latest_version`: Latest version number
- `created_at`, `updated_at`: Timestamps

### 9. `docs_rs_search_items`

Search for specific item types within a crate.

**Parameters:**
- `crate` (string, required): Crate name
- `version` (string, optional): Version (default: "latest")
- `item_type` (string, optional): Item type to filter by (mod, struct, enum, fn, trait, macro, type, constant)

**Example:**
```json
{
  "crate": "tokio",
  "item_type": "trait"
}
```

**Returns:**
- `items`: Array of items with name, kind, description, and path

### 10. `docs_rs_get_source_link`

Get source code link and repository information for a crate.

**Parameters:**
- `crate` (string, required): Crate name
- `version` (string, optional): Version (default: "latest")

**Example:**
```json
{
  "crate": "serde"
}
```

**Returns:**
- `repository`: GitHub/GitLab repository URL
- `source_url`: Direct source code link
- `download_url`: Crate download URL

### 11. `docs_rs_get_features`

Get crate features and configuration options.

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
- `features`: Array of feature names
- `has_features`: Boolean indicating if features were found

### 12. `docs_rs_get_dependencies`

Get direct dependencies of a crate.

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

### 13. `docs_rs_get_owners`

Get crate owners and maintainers from crates.io.

**Parameters:**
- `crate` (string, required): Crate name

**Example:**
```json
{
  "crate": "serde"
}
```

### 14. `docs_rs_search_rustdoc`

Search rustdoc across crates for a symbol or type.

**Parameters:**
- `query` (string, required): Search query for symbol or type
- `limit` (number, optional): Maximum results (default: 10)

**Example:**
```json
{
  "query": "Runtime",
  "limit": 5
}
```

### 15. `docs_rs_get_releases`

Get crate release history with dates.

**Parameters:**
- `crate` (string, required): Crate name
- `limit` (number, optional): Maximum releases (default: 20)

**Example:**
```json
{
  "crate": "tokio",
  "limit": 10
}
```

### 16. `docs_rs_get_trait_impls`

Find all implementations of a trait in a crate.

**Parameters:**
- `crate` (string, required): Crate name
- `trait_name` (string, optional): Name of the trait to search for
- `version` (string, optional): Version (default: "latest")

**Example:**
```json
{
  "crate": "tokio",
  "trait_name": "Future"
}
```

### 17. `docs_rs_get_source_code`

Get source code for a specific item.

**Parameters:**
- `crate` (string, required): Crate name
- `version` (string, optional): Version (default: "latest")
- `path` (string, required): Documentation path to the item

**Example:**
```json
{
  "crate": "serde",
  "version": "latest",
  "path": "serde/ser/trait.Serialize.html"
}
```

### 18. `docs_rs_get_keywords`

Get crate keywords and categories from crates.io.

**Parameters:**
- `crate` (string, required): Crate name

**Example:**
```json
{
  "crate": "actix-web"
}
```

### 19. `docs_rs_get_license`

Get crate license information.

**Parameters:**
- `crate` (string, required): Crate name

**Example:**
```json
{
  "crate": "tokio"
}
```

### 20. `docs_rs_compare_versions`

Compare two versions of a crate.

**Parameters:**
- `crate` (string, required): Crate name
- `version1` (string, required): First version to compare
- `version2` (string, required): Second version to compare

**Example:**
```json
{
  "crate": "tokio",
  "version1": "1.30.0",
  "version2": "1.35.0"
}
```

**Returns:**
- `version1_items`: Item counts for version 1
- `version2_items`: Item counts for version 2
- `comparison`: Diff for each item type

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
