const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");

const seedUrl = "https://websoham.com";
const whitelistDomains = ["trusteddomain.com"];
const blacklistDomains = ["maliciousdomain.com"];
const maxCrawlDepth = 2;

const crawl = async (url, depth = 0) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const internalLinks = [];
    const externalLinks = [];

    $("a").each((index, element) => {
      const href = $(element).attr("href");
      if (href) {
        const absoluteUrl = new URL(href, url).toString();
        const parsedUrl = new URL(absoluteUrl);

        if (parsedUrl.origin === new URL(seedUrl).origin) {
          // Internal link
          internalLinks.push(absoluteUrl);
        } else if (
          whitelistDomains.includes(parsedUrl.hostname) &&
          !blacklistDomains.includes(parsedUrl.hostname)
        ) {
          // External link from whitelisted domain
          externalLinks.push(absoluteUrl);
        }
      }
    });

    // Apply additional conditions or processing based on your requirements

    if (depth < maxCrawlDepth) {
      // Recursively crawl internal links
      for (const internalLink of internalLinks) {
        await crawl(internalLink, depth + 1);
      }
    }

    console.log(
      `Depth ${depth}: Internal Links - ${internalLinks.length}, External Links - ${externalLinks.length}`
    );
  } catch (error) {
    console.error(`Error crawling ${url}: ${error.message}`);
  }
};

crawl(seedUrl);
