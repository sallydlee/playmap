import { DATA_FILES } from '../config.js';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}

// Loads the four data-contract files in parallel.
export async function loadData() {
  const [facilities, blockGroups, recommendations, citySummary] = await Promise.all([
    getJson(DATA_FILES.facilities),
    getJson(DATA_FILES.blockGroups),
    getJson(DATA_FILES.recommendations),
    getJson(DATA_FILES.citySummary),
  ]);
  return { facilities, blockGroups, recommendations, citySummary };
}
