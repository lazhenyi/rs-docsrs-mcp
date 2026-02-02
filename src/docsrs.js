import fetch from "node-fetch";
import * as cheerio from "cheerio";

const DEFAULT_TIMEOUT = 10_000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();

  const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "docsrs-mcp/0.1.0"
      }
    });

    if (!res.ok) {
      throw new Error(`docs.rs http error: ${res.status}`);
    }

    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Search for crates on docs.rs
 */
export async function searchCrates(query) {
  const url =
    "https://docs.rs/releases/search?query=" +
    encodeURIComponent(query);

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const results = [];

  $("li.release").each((_, el) => {
    const link = $(el).find(".release-name a").first();

    const name = link.text().trim();
    const href = link.attr("href");

    const version = $(el).find(".version").first().text().trim();
    const description = $(el).find(".description").first().text().trim();

    if (!name || !href) return;

    results.push({
      name,
      version: version || null,
      description: description || null,
      docs_url: "https://docs.rs" + href
    });
  });

  return results;
}

/**
 * Get crate homepage information on docs.rs
 * (Not an API, just scraping the homepage)
 */
export async function fetchCrateHome(crate) {
  const url = `https://docs.rs/${encodeURIComponent(crate)}/`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const title =
    $("h1").first().text().trim() || crate;

  const description =
    $('meta[name="description"]').attr("content") || null;

  let latestVersion = null;

  const versionLink = $('a[href^="/' + crate + '/"]').first();
  if (versionLink.length) {
    const href = versionLink.attr("href");
    const m = href.match(new RegExp(`/${crate}/([^/]+)/`));
    if (m) latestVersion = m[1];
  }

  return {
    crate,
    title,
    description,
    latest_version: latestVersion,
    homepage: url
  };
}

/**
 * Get documentation content for a specific path in a crate
 * @param {string} crate - Crate name
 * @param {string} version - Version (use "latest" for the latest version)
 * @param {string} path - Documentation path (e.g., "tokio/runtime/index.html")
 */
export async function fetchCrateDoc(crate, version = "latest", path = "") {
  // Construct URL
  let url = `https://docs.rs/${encodeURIComponent(crate)}/${encodeURIComponent(version)}/`;
  
  if (path) {
    // Remove leading/trailing slashes
    const cleanPath = path.replace(/^\/+|\/+$/g, "");
    url += cleanPath;
  } else {
    // Default to crate root documentation
    url += `${crate.replace(/-/g, "_")}/index.html`;
  }

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  // Extract main documentation content
  const mainContent = $(".main-heading, .docblock").map((_, el) => {
    return $(el).text().trim();
  }).get().filter(text => text.length > 0);

  // Extract item descriptions (functions, structs, etc.)
  const items = [];
  $(".item-name").each((_, el) => {
    const $item = $(el);
    const name = $item.text().trim();
    const description = $item.closest(".item-table").find(".desc").first().text().trim();
    
    if (name) {
      items.push({
        name,
        description: description || null
      });
    }
  });

  // Get page title
  const pageTitle = $("h1.fqn").first().text().trim() || 
                    $(".main-heading h1").first().text().trim() ||
                    $("title").text().trim();

  // Get main description
  const mainDesc = $(".docblock.type-decl-sub").first().text().trim() ||
                   $(".docblock").first().text().trim();

  return {
    crate,
    version,
    path: path || "index",
    url,
    title: pageTitle,
    description: mainDesc,
    content: mainContent.slice(0, 5), // First 5 content blocks
    items: items.slice(0, 20) // First 20 items
  };
}

/**
 * List available modules/items in a crate
 */
export async function listCrateModules(crate, version = "latest") {
  const url = `https://docs.rs/${encodeURIComponent(crate)}/${encodeURIComponent(version)}/${crate.replace(/-/g, "_")}/index.html`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const modules = [];
  const structs = [];
  const enums = [];
  const functions = [];
  const traits = [];
  const macros = [];

  // Parse modules
  $("#modules + .item-table .item-name, #modules + .item-table-wrap .item-name").each((_, el) => {
    const name = $(el).find("a.mod").text().trim();
    const desc = $(el).closest("tr, .item-table").find(".desc, .desc-docblock").first().text().trim();
    if (name) modules.push({ name, description: desc || null });
  });

  // Parse structs
  $("#structs + .item-table .item-name, #structs + .item-table-wrap .item-name").each((_, el) => {
    const name = $(el).find("a.struct").text().trim();
    const desc = $(el).closest("tr, .item-table").find(".desc, .desc-docblock").first().text().trim();
    if (name) structs.push({ name, description: desc || null });
  });

  // Parse enums
  $("#enums + .item-table .item-name, #enums + .item-table-wrap .item-name").each((_, el) => {
    const name = $(el).find("a.enum").text().trim();
    const desc = $(el).closest("tr, .item-table").find(".desc, .desc-docblock").first().text().trim();
    if (name) enums.push({ name, description: desc || null });
  });

  // Parse functions
  $("#functions + .item-table .item-name, #functions + .item-table-wrap .item-name").each((_, el) => {
    const name = $(el).find("a.fn").text().trim();
    const desc = $(el).closest("tr, .item-table").find(".desc, .desc-docblock").first().text().trim();
    if (name) functions.push({ name, description: desc || null });
  });

  // Parse traits
  $("#traits + .item-table .item-name, #traits + .item-table-wrap .item-name").each((_, el) => {
    const name = $(el).find("a.trait").text().trim();
    const desc = $(el).closest("tr, .item-table").find(".desc, .desc-docblock").first().text().trim();
    if (name) traits.push({ name, description: desc || null });
  });

  // Parse macros
  $("#macros + .item-table .item-name, #macros + .item-table-wrap .item-name").each((_, el) => {
    const name = $(el).find("a.macro").text().trim();
    const desc = $(el).closest("tr, .item-table").find(".desc, .desc-docblock").first().text().trim();
    if (name) macros.push({ name, description: desc || null });
  });

  return {
    crate,
    version,
    modules,
    structs,
    enums,
    functions,
    traits,
    macros
  };
}

/**
 * Get README or crate-level documentation
 */
export async function fetchCrateReadme(crate, version = "latest") {
  const url = `https://docs.rs/crate/${encodeURIComponent(crate)}/${encodeURIComponent(version)}`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  // Try to get README content
  const readmeContent = $(".readme, .pure-u-14-24").first().text().trim();
  
  // Get crate metadata
  const metadata = {};
  $(".pure-u-10-24 p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes("Repository:")) {
      const link = $(el).find("a").attr("href");
      if (link) metadata.repository = link;
    }
    if (text.includes("Documentation:")) {
      const link = $(el).find("a").attr("href");
      if (link) metadata.documentation = link;
    }
  });

  return {
    crate,
    version,
    readme: readmeContent || null,
    metadata
  };
}
