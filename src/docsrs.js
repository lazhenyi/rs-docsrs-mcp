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

  // New structure: li > a.release
  $("li > a.release").each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href");

    // Name and version are in .name div like "tokio-1.49.0"
    const nameText = $link.find(".name").first().text().trim();
    const description = $link.find(".description").first().text().trim();

    if (!nameText || !href) return;

    // Split "tokio-1.49.0" into name and version
    const lastDash = nameText.lastIndexOf("-");
    const name = lastDash > 0 ? nameText.substring(0, lastDash) : nameText;
    const version = lastDash > 0 ? nameText.substring(lastDash + 1) : null;

    results.push({
      name,
      version,
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

  // Parse modules - using dl.item-table dt/dd structure
  $("#modules + dl.item-table > dt").each((_, el) => {
    const $dt = $(el);
    const name = $dt.find("a.mod").text().trim();
    const $dd = $dt.next("dd");
    const desc = $dd.text().trim();
    if (name) modules.push({ name, description: desc || null });
  });

  // Parse structs
  $("#structs + dl.item-table > dt").each((_, el) => {
    const $dt = $(el);
    const name = $dt.find("a.struct").text().trim();
    const $dd = $dt.next("dd");
    const desc = $dd.text().trim();
    if (name) structs.push({ name, description: desc || null });
  });

  // Parse enums
  $("#enums + dl.item-table > dt").each((_, el) => {
    const $dt = $(el);
    const name = $dt.find("a.enum").text().trim();
    const $dd = $dt.next("dd");
    const desc = $dd.text().trim();
    if (name) enums.push({ name, description: desc || null });
  });

  // Parse functions
  $("#functions + dl.item-table > dt").each((_, el) => {
    const $dt = $(el);
    const name = $dt.find("a.fn").text().trim();
    const $dd = $dt.next("dd");
    const desc = $dd.text().trim();
    if (name) functions.push({ name, description: desc || null });
  });

  // Parse traits
  $("#traits + dl.item-table > dt").each((_, el) => {
    const $dt = $(el);
    const name = $dt.find("a.trait").text().trim();
    const $dd = $dt.next("dd");
    const desc = $dd.text().trim();
    if (name) traits.push({ name, description: desc || null });
  });

  // Parse macros
  $("#macros + dl.item-table > dt").each((_, el) => {
    const $dt = $(el);
    const name = $dt.find("a.macro").text().trim();
    const $dd = $dt.next("dd");
    const desc = $dd.text().trim();
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

  // Extract README content - it's in the main container div
  let readmeContent = "";
  
  // Remove script and style tags first
  $("script, style").remove();
  
  // The README is in .container > .rustdoc or just the main content area
  const mainContent = $(".container .rustdoc, .container > .pure-g, main").first();
  
  if (mainContent.length) {
    // Get text content, removing navigation and header elements
    const tempDiv = mainContent.clone();
    tempDiv.find("nav, .nav-container, .pure-menu, header").remove();
    readmeContent = tempDiv.text().trim();
  }
  
  // If still empty, try alternative selectors
  if (!readmeContent) {
    readmeContent = $(".readme, .pure-u-14-24").first().text().trim();
  }
  
  // Get crate metadata
  const metadata = {};
  
  // Look for repository link
  $("a[href*='github.com'], a[href*='gitlab.com'], a[href*='bitbucket.org']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && !metadata.repository && !href.includes('/tokio-rs/tokio/')) {
      // Prefer the first repo link that looks like a source repository
      if (href.match(/github\.com\/[\w-]+\/[\w-]+\/?$/)) {
        metadata.repository = href;
        return false; // break
      }
    }
  });
  
  // Fallback for common repo patterns
  if (!metadata.repository) {
    $("a[href*='github.com']").first().each((_, el) => {
      const href = $(el).attr("href");
      if (href) metadata.repository = href;
    });
  }
  
  // Get documentation link
  const docsLink = $(`a[href*='docs.rs/${crate}']`).first().attr("href");
  if (docsLink) {
    metadata.documentation = docsLink.startsWith('http') ? docsLink : 'https://docs.rs' + docsLink;
  }

  return {
    crate,
    version,
    readme: readmeContent || null,
    metadata
  };
}
