const cheerio = require("cheerio");
const axios = require("axios");
const urlParser = require("url");
const { supabase } = require("../config/config");
const {
  validDomain,
  getUrl,
  ignoreExtention,
  getRandomUserAgent,
} = require("../utils/index.js");

const headers = {
  "User-Agent": getRandomUserAgent(),
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
};

// for update external link in supabase
let externalLink = [];
const externalLinkAdd = async () => {
  if (externalLink?.length > 0) {
    const { data } = await supabase
      .from("crawling_external_link")
      .upsert(externalLink, { onConflict: ["url"] });
    externalLink = [];
    console.log(data, "externalLink");
  } else {
    return;
  }
};
const seenUrls = {};
const seenExternalLink = {};

// for update internal link in supabase
let pages = [];
let internalLinks = [];
const internalLinkAdd = async () => {
  if (internalLinks?.length > 0) {
    const { data } = await supabase
      .from("crawling_internal_link")
      .upsert(internalLinks, { onConflict: ["page_url"] });
    internalLinks = [];
    console.log(data, "internal error link");
  } else {
    return;
  }
};

// for update error pages in supabase
let internalLinkError = [];
const errorInternalLinkAdd = async () => {
  if (internalLinkError?.length > 0) {
    const { data } = await supabase
      .from("crawling_internal_link")
      .upsert(internalLinkError, { onConflict: ["page_url"] });
    internalLinkError = [];
    console.log(data, "internal error link");
  } else {
    return;
  }
};

let counter = 1;
const crawl = async ({ url, ignore }) => {
  try {
    if (seenUrls[url]) return;
    seenUrls[url] = true;
    const { host, protocol } = urlParser.parse(url);
    const response = await axios.get(url, headers);
    const contentType = response.headers["content-type"];

    if (!contentType.includes("text/html")) return;
    const $ = cheerio.load(response.data);

    const links = $("a")
      .map((i, link) => link.attribs.href)
      .get();
    if (seenUrls[url]) {
      await supabase.from("crawling_internal_link").upsert(
        { page_url: url, status: true },
        {
          onConflict: ["page_url"],
          updateColumns: ["status"],
        }
      );
    }
    console.log(`Crawling At Page no.: ${counter++}\n____________________`);

    if (links?.length > 0) {
      await Promise.all(
        links
          .filter((link) => !link.includes(host) && link.startsWith(protocol))
          .map(async (link) => {
            let linkHostname = urlParser.parse(link).hostname;
            if (linkHostname?.startsWith("www.")) {
              linkHostname = linkHostname.replace(/^www\./, "");
            }
            const validUrl = validDomain(linkHostname);
            if (validUrl) {
              if (!seenExternalLink[validUrl]) {
                seenExternalLink[validUrl] = true;
                externalLink.push({ url: validUrl });
              }
              // if (!externalLink["url"]?.includes(validUrl)) {
              //   ;
              // }
            }
          })
      );
      const internalLinkSet = new Set(
        links.filter((link) => link.includes(host) && !link.includes(ignore))
      );

      const internalLink = Array.from(internalLinkSet);

      internalLink.filter((link) => {
        return getUrl(link, host, protocol);
      });

      internalLink.forEach(async (link) => {
        const endsWithignoreExtention = ignoreExtention.some((extension) =>
          link.toLowerCase().endsWith(extension)
        );
        if (!endsWithignoreExtention) {
          if (!pages?.includes(link)) {
            internalLinks.push({ page_url: link });
            pages.push(link);
          } else {
            return link;
          }
        }
      });
      internalLink.forEach((link) => {
        crawl({
          url: link,
          ignore,
        });
      });
    }
    return;
  } catch (error) {
    // Handle other errors
    internalLinkError.push({
      page_url: url,
      message: `"Error:" ${error.message}`,
    });
  }
};

if (process.argv.length > 2) {
  const url = process.argv[2];

  crawl({
    url: url,
    ignore: "/search",
  });
  setInterval(errorInternalLinkAdd, 10000);
  setInterval(internalLinkAdd, 10000);
  setInterval(externalLinkAdd, 10000);
} else {
  console.log("No url found.");
}
