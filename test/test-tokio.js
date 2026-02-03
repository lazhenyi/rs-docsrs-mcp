#!/usr/bin/env node

import {
  searchCrates,
  fetchCrateHome,
  listCrateModules,
  fetchCrateReadme
} from "../src/docsrs.js";

console.log("Testing tokio crate...\n");

try {
  console.log("1. Testing searchCrates...");
  const searchResults = await searchCrates("tokio");
  console.log("Search results:", JSON.stringify(searchResults, null, 2));
  console.log("\n");

  console.log("2. Testing listCrateModules...");
  const modules = await listCrateModules("tokio", "latest");
  console.log("Modules:", JSON.stringify(modules, null, 2));
  console.log("\n");

  console.log("3. Testing fetchCrateReadme...");
  const readme = await fetchCrateReadme("tokio", "latest");
  console.log("README:", JSON.stringify(readme, null, 2));
  console.log("\n");

  console.log("4. Testing fetchCrateHome...");
  const home = await fetchCrateHome("tokio");
  console.log("Home:", JSON.stringify(home, null, 2));

  // Verify results
  if (!searchResults || searchResults.length === 0) {
    throw new Error("searchCrates returned no results");
  }
  if (!modules || !modules.modules || modules.modules.length === 0) {
    throw new Error("listCrateModules returned no modules");
  }
  if (!readme || !readme.readme) {
    throw new Error("fetchCrateReadme returned no readme");
  }
  if (!home || !home.latest_version) {
    throw new Error("fetchCrateHome returned invalid data");
  }

  console.log("\n✓ All tests passed!");
  process.exit(0);

} catch (e) {
  console.error("✗ Test failed:", e);
  process.exit(1);
}
