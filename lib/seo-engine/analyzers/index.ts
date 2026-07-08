import { FetchedPage } from "../../fetchPage";
import { DimensionResult } from "../scoring/types";
import { analyzeCrawlability } from "./crawlability";
import { analyzeTechnicalPerformance } from "./technicalPerformance";
import { analyzeOnPage } from "./onPage";
import { analyzeSiteArchitecture } from "./siteArchitecture";
import { analyzeContentQuality } from "./contentQuality";
import { analyzeStructuredData } from "./structuredData";
import { analyzeOffSiteAuthority } from "./offSiteAuthority";

/**
 * Runs all 7 dimension analyzers concurrently against a single fetched
 * page. Crawlability and Technical Performance each make their own
 * additional network calls (robots.txt/sitemap, PageSpeed/Moz APIs)
 * beyond the initial page fetch, so Promise.all here parallelizes those
 * rather than running the whole audit serially.
 */
export async function runAllAnalyzers(page: FetchedPage): Promise<DimensionResult[]> {
  const results = await Promise.all([
    analyzeCrawlability(page),
    analyzeTechnicalPerformance(page),
    analyzeOnPage(page),
    analyzeSiteArchitecture(page),
    analyzeContentQuality(page),
    analyzeStructuredData(page),
    analyzeOffSiteAuthority(page),
  ]);

  return results;
}
