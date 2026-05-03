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

/**
 * List all available versions of a crate
 */
export async function listCrateVersions(crate) {
  const url = `https://docs.rs/${encodeURIComponent(crate)}/`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const versions = [];

  // Get version from page title like "tokio - Docs.rs"
  const titleMatch = $("title").first().text().trim().match(/^(.+) - Docs\.rs$/);
  const crateName = titleMatch ? titleMatch[1] : crate;

  // Find version links in the page
  $("a[href*='/" + crate + "/']").each((_, el) => {
    const href = $(el).attr("href");
    const match = href.match(new RegExp(`/${crate}/([^/]+)/?`));
    if (match && match[1]) {
      const version = match[1];
      // Skip "latest" and only collect specific versions
      if (version !== "latest" && !versions.includes(version)) {
        versions.push(version);
      }
    }
  });

  // Also try to find versions in release list
  $("li.release").each((_, el) => {
    const href = $(el).find("a").attr("href");
    const match = href?.match(new RegExp(`/${crate}/([^/]+)/`));
    if (match && match[1]) {
      const version = match[1];
      if (!versions.includes(version)) {
        versions.push(version);
      }
    }
  });

  return {
    crate,
    versions: [...new Set(versions)].sort((a, b) => {
      // Sort versions descending (newest first)
      try {
        const aParts = a.split(".").map(Number);
        const bParts = b.split(".").map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (bVal !== aVal) return bVal - aVal;
        }
      } catch (e) {
        // If version comparison fails, sort alphabetically
      }
      return b.localeCompare(a);
    }),
    latest_url: `https://docs.rs/${encodeURIComponent(crate)}/latest/`
  };
}

/**
 * Get reverse dependencies (which crates depend on this crate)
 */
export async function getReverseDependencies(crate) {
  // docs.rs doesn't directly show reverse deps, but we can check crates.io
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`;

  const html = await fetchWithTimeout(url);
  
  // Try to parse as JSON first
  try {
    const data = JSON.parse(html);
    return {
      crate,
      dependents_count: data.dependents_count || 0,
      // Note: full reverse dependency list requires additional API calls
      message: "For full reverse dependency list, use crates.io API directly"
    };
  } catch (e) {
    // Fallback to scraping docs.rs
    const $ = cheerio.load(html);
    
    // Look for any links that indicate dependency information
    const info = [];
    $("a[href*='crates.io']").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text && href && !info.find(i => i.name === text)) {
        info.push({ name: text, url: href });
      }
    });
    
    return {
      crate,
      info,
      note: "Reverse dependencies info from docs.rs page"
    };
  }
}

/**
 * Get download statistics for a crate
 */
export async function getCrateDownloads(crate) {
  // Use crates.io API for download stats
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`;

  const response = await fetchWithTimeout(url);
  
  try {
    const data = JSON.parse(response);
    return {
      crate,
      downloads: {
        all: data.downloads || 0,
        recent: data.recent_downloads || 0
      },
      versions: data.versions?.length || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      latest_version: data.latest_version?.num || null,
      max_version: data.max_version || null
    };
  } catch (e) {
    return {
      crate,
      error: "Failed to fetch download statistics",
      message: "Could not parse crates.io API response"
    };
  }
}

/**
 * Search for specific item types within a crate (traits, structs, functions, etc.)
 */
export async function searchCrateItems(crate, version = "latest", itemType = null) {
  // itemType can be: mod, struct, enum, fn, trait, macro, type, constant
  const url = `https://docs.rs/${encodeURIComponent(crate)}/${encodeURIComponent(version)}/${crate.replace(/-/g, "_")}/index.html`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const results = {
    crate,
    version,
    itemType: itemType || "all",
    items: []
  };

  // Build selector based on item type
  const typeMap = {
    mod: "a.mod",
    struct: "a.struct",
    enum: "a.enum",
    fn: "a.fn",
    trait: "a.trait",
    macro: "a.macro",
    type: "a.type",
    constant: "a.constant"
  };

  const selectors = itemType && typeMap[itemType] 
    ? [`#${itemType + "s"} + dl.item-table > dt`] 
    : ["dl.item-table > dt"];

  $(selectors.join(", ")).each((_, el) => {
    const $dt = $(el);
    
    // Get item name based on type filter
    let itemName = null;
    let itemKind = null;
    
    if (!itemType || itemType === "all") {
      // Try each type
      for (const [kind, sel] of Object.entries(typeMap)) {
        const link = $dt.find(sel);
        if (link.length) {
          itemName = link.text().trim();
          itemKind = kind;
          break;
        }
      }
    } else {
      const link = $dt.find(typeMap[itemType] || typeMap.struct);
      if (link.length) {
        itemName = link.text().trim();
        itemKind = itemType;
      }
    }
    
    if (itemName) {
      const $dd = $dt.next("dd");
      const desc = $dd.text().trim();
      const href = $dt.find("a").first().attr("href");
      
      results.items.push({
        name: itemName,
        kind: itemKind,
        description: desc || null,
        path: href ? `/${crate}/${version}/${href}` : null
      });
    }
  });

  return results;
}

/**
 * Get source code link for a crate
 */
export async function getCrateSourceLink(crate, version = "latest") {
  // First try to get from docs.rs
  let sourceUrl = null;
  let repository = null;

  // Try crates.io API for source link
  const apiUrl = `https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`;
  const response = await fetchWithTimeout(apiUrl);
  
  try {
    const data = JSON.parse(response);
    repository = data.repository;
    if (data.repository) {
      // Convert repository URL to source URL pattern
      sourceUrl = data.repository;
    }
  } catch (e) {
    // Continue with fallback
  }

  // Also check docs.rs page for source links
  const docsUrl = `https://docs.rs/${encodeURIComponent(crate)}/${encodeURIComponent(version)}/`;
  const html = await fetchWithTimeout(docsUrl);
  const $ = cheerio.load(html);

  // Look for source link in page
  $("a[href*='github.com'], a[href*='gitlab.com'], a[href*='bitbucket.org']").each((_, el) => {
    if (!sourceUrl) {
      const href = $(el).attr("href");
      if (href && (href.includes("tree") || href.includes("blob") || href.includes("src"))) {
        sourceUrl = href;
      }
    }
    if (!repository && $(el).text().toLowerCase().includes("source")) {
      repository = $(el).attr("href");
    }
  });

  // Build source URL for specific version if we have repository
  let versionSourceUrl = null;
  if (repository) {
    // Try to construct source archive URL
    versionSourceUrl = `https://crates.io/api/v1/crates/${crate}/${version}/download`;
  }

  return {
    crate,
    version,
    repository,
    source_url: sourceUrl,
    download_url: versionSourceUrl
  };
}

/**
 * Get crate features and configuration options
 */
export async function getCrateFeatures(crate, version = "latest") {
  // Get the main doc page and look for feature information
  const url = `https://docs.rs/${encodeURIComponent(crate)}/${encodeURIComponent(version)}/${crate.replace(/-/g, "_")}/index.html`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const features = [];
  const devDependencies = [];
  const buildDependencies = [];

  // Look for feature flags in documentation
  $("a[href*='#features']").each((_, el) => {
    const text = $(el).text().trim();
    if (text && !features.includes(text)) {
      features.push(text);
    }
  });

  // Look for feature sections in the doc
  $("section[id*='feature'], h2[id*='feature']").each((_, el) => {
    const text = $(el).text().trim();
    if (text && !features.includes(text)) {
      features.push(text);
    }
  });

  // Try to get feature info from HTML data attributes or titles
  $("[title*='feature'], [data-feature]").each((_, el) => {
    const text = $(el).attr("title") || $(el).attr("data-feature");
    if (text && !features.includes(text)) {
      features.push(text);
    }
  });

  // Check for feature list in sidebar or navigation
  $("nav a, .sidebar a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    if ((href.includes("feature") || text.toLowerCase().includes("feature")) && !features.includes(text)) {
      features.push(text);
    }
  });

  // Look for optional dependencies which are often listed as features
  $(".variant, .method, .structfield").each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes("optional") && !features.includes(text)) {
      features.push(text);
    }
  });

  return {
    crate,
    version,
    features: [...new Set(features)],
    has_features: features.length > 0,
    note: "Feature detection from docs.rs page - may not be comprehensive"
  };
}

/**
 * Get direct dependencies of a crate
 */
export async function getCrateDependencies(crate, version = "latest") {
  const url = `https://docs.rs/${encodeURIComponent(crate)}/${encodeURIComponent(version)}/${crate.replace(/-/g, "_")}/index.html`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const dependencies = [];

  $("a[href*='/']").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();

    if (href && href.match(/^\/[a-z0-9_-]+\/\d+\.\d+/i) && text && !text.includes("/")) {
      const match = href.match(/^\/([a-z0-9_-]+)\//i);
      if (match && match[1] && match[1] !== crate && !dependencies.find(d => d.name === match[1])) {
        dependencies.push({
          name: match[1],
          path: href
        });
      }
    }
  });

  return {
    crate,
    version,
    dependencies,
    total: dependencies.length
  };
}

/**
 * Get crate owners and maintainers from crates.io
 */
export async function getCrateOwners(crate) {
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`;

  const response = await fetchWithTimeout(url);

  try {
    const data = JSON.parse(response);
    const owners = (data.owners || []).map(owner => ({
      id: owner.id,
      login: owner.login,
      name: owner.name || owner.login,
      avatar: owner.avatar,
      url: owner.url
    }));

    return {
      crate,
      owners,
      total: owners.length
    };
  } catch (e) {
    return {
      crate,
      owners: [],
      error: "Failed to fetch crate owners"
    };
  }
}

/**
 * Search rustdoc across crates for a symbol or type
 */
export async function searchRustDoc(query, limit = 10) {
  const url = `https://docs.rs/releases/search?query=${encodeURIComponent(query)}`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const results = [];

  $("li > a.release").each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href");
    const nameText = $link.find(".name").first().text().trim();
    const description = $link.find(".description").first().text().trim();

    if (!nameText || !href) return;

    const lastDash = nameText.lastIndexOf("-");
    const name = lastDash > 0 ? nameText.substring(0, lastDash) : nameText;
    const version = lastDash > 0 ? nameText.substring(lastDash + 1) : null;

    results.push({
      crate: name,
      version,
      description: description || null,
      docs_url: "https://docs.rs" + href
    });
  });

  return {
    query,
    total: results.length,
    results: results.slice(0, limit)
  };
}

/**
 * Get crate release history with dates
 */
export async function getCrateReleases(crate, limit = 20) {
  const url = `https://docs.rs/releases/search?query=${encodeURIComponent(crate)}&limit=${limit}`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const releases = [];

  $("li.release").each((_, el) => {
    const $link = $(el).find("a");
    const href = $link.attr("href") || "";
    const nameText = $link.find(".release-name").text().trim() || 
                     $link.find(".name").text().trim();
    const versionMatch = href.match(new RegExp(`/${crate}/([^/]+)/`));

    if (versionMatch && versionMatch[1]) {
      const version = versionMatch[1];
      const dateText = $(el).find(".date, .release-date").text().trim();
      const description = $(el).find(".description").text().trim();

      releases.push({
        version,
        date: dateText || null,
        description: description || null,
        url: "https://docs.rs" + href
      });
    }
  });

  return {
    crate,
    releases: releases.slice(0, limit),
    total: releases.length
  };
}

/**
 * Find all implementations of a trait in a crate
 */
export async function getTraitImplementations(crate, traitName, version = "latest") {
  const url = `https://docs.rs/${encodeURIComponent(crate)}/${encodeURIComponent(version)}/${crate.replace(/-/g, "_")}/index.html`;

  const html = await fetchWithTimeout(url);
  const $ = cheerio.load(html);

  const implementations = [];

  $("a.trait").each((_, el) => {
    const name = $(el).text().trim();
    if (name === traitName || !traitName) {
      const href = $(el).attr("href");
      const $dt = $(el).closest("dt");
      const $dd = $dt.next("dd");
      const desc = $dd.text().trim();

      implementations.push({
        name,
        description: desc || null,
        path: href
      });
    }
  });

  return {
    crate,
    trait: traitName,
    version,
    implementations,
    total: implementations.length
  };
}

/**
 * Get source code for a specific item
 */
export async function getItemSourceCode(crate, version, path) {
  if (!path) {
    return { error: "Path is required" };
  }

  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  let sourceUrl = `https://docs.rs/${encodeURIComponent(crate)}/${encodeURIComponent(version)}/${cleanPath.replace(/\.html$/, ".source.html")}`;

  const html = await fetchWithTimeout(sourceUrl);
  const $ = cheerio.load(html);

  const sourceContent = $("pre.source").text().trim() || $(".line-numbered").text().trim();

  return {
    crate,
    version,
    path: cleanPath,
    source_url: sourceUrl,
    source: sourceContent || null,
    has_source: !!sourceContent
  };
}

/**
 * Get crate keywords and categories from crates.io
 */
export async function getCrateKeywords(crate) {
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`;

  const response = await fetchWithTimeout(url);

  try {
    const data = JSON.parse(response);
    return {
      crate,
      keywords: data.keywords || [],
      categories: data.categories || [],
      total_keywords: (data.keywords || []).length,
      total_categories: (data.categories || []).length
    };
  } catch (e) {
    return {
      crate,
      keywords: [],
      categories: [],
      error: "Failed to fetch keywords"
    };
  }
}

/**
 * Get crate license information
 */
export async function getCrateLicense(crate) {
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`;

  const response = await fetchWithTimeout(url);

  try {
    const data = JSON.parse(response);
    const license = data.license || "Unknown";

    return {
      crate,
      license,
      spdx_id: license,
      is_spdx: license.length < 40 && !license.includes("OR"),
      repository: data.repository || null
    };
  } catch (e) {
    return {
      crate,
      license: "Unknown",
      error: "Failed to fetch license"
    };
  }
}

/**
 * Compare two versions of a crate
 */
export async function compareCrateVersions(crate, version1, version2) {
  const baseUrl = `https://docs.rs/${encodeURIComponent(crate)}`;

  const url1 = `${baseUrl}/${encodeURIComponent(version1)}/${crate.replace(/-/g, "_")}/index.html`;
  const url2 = `${baseUrl}/${encodeURIComponent(version2)}/${crate.replace(/-/g, "_")}/index.html`;

  const [html1, html2] = await Promise.all([
    fetchWithTimeout(url1),
    fetchWithTimeout(url2).catch(() => null)
  ]);

  const $1 = cheerio.load(html1);
  const parseItems = ($) => {
    const items = {
      modules: 0,
      structs: 0,
      enums: 0,
      functions: 0,
      traits: 0,
      macros: 0
    };

    items.modules = $("#modules + dl.item-table > dt").length;
    items.structs = $("#structs + dl.item-table > dt").length;
    items.enums = $("#enums + dl.item-table > dt").length;
    items.functions = $("#functions + dl.item-table > dt").length;
    items.traits = $("#traits + dl.item-table > dt").length;
    items.macros = $("#macros + dl.item-table > dt").length;

    return items;
  };

  const v1Items = parseItems($1);
  let v2Items = null;

  if (html2) {
    const $2 = cheerio.load(html2);
    v2Items = parseItems($2);
  }

  return {
    crate,
    version1,
    version2,
    version1_items: v1Items,
    version2_items: v2Items,
    comparison: v2Items ? {
      module_diff: v2Items.modules - v1Items.modules,
      struct_diff: v2Items.structs - v1Items.structs,
      enum_diff: v2Items.enums - v1Items.enums,
      function_diff: v2Items.functions - v1Items.functions,
      trait_diff: v2Items.traits - v1Items.traits,
      macro_diff: v2Items.macros - v1Items.macros
    } : null
  };
}
