const cheerio = require("cheerio");
const axios = require("axios");
const urlParser = require("url");
const { supabase } = require("../config/config");
const { validDomain, getRandomUserAgent } = require("../utils/index.js");

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

const seenUrls = {};
const seenExternalLink = {};
let counter = 1;
const crawl = async ({ url, ignore }) => {
  try {
    if (seenUrls[url]) return;
    seenUrls[url] = true;
    const { host, protocol } = urlParser.parse(url);
    // console.log(url, ">>>>>>>>>");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.get(url, headers);
    const contentType = response.headers["content-type"];

    if (!contentType.includes("text/html")) return;
    const $ = cheerio.load(response.data);

    const links = $("a")
      .map((i, link) => link.attribs.href)
      .get();
    if (seenUrls[url]) {
      try {
        await supabase.from("sitemap_internal_link").upsert(
          { page_url: url, status: true, message: "done" },
          {
            onConflict: ["page_url"],
            updateColumns: ["status", "message"],
          }
        );
      } catch (error) {
        console.log(error.message, "internal link update");
      }

      // console.log(error, "update internal link");
    }
    console.log(`Crawling At Page no.: ${counter++}`);

    if (links?.length > 0) {
      links.forEach(async (link) => {
        if (!link.includes(host) && link.startsWith(protocol)) {
          let linkHostname = urlParser.parse(link).hostname;
          if (linkHostname?.startsWith("www.")) {
            linkHostname = linkHostname.replace(/^www\./, "");
          }
          const validUrl = validDomain(linkHostname);
          if (validUrl && !seenExternalLink[validUrl]) {
            seenExternalLink[validUrl] = true;
            try {
              await supabase
                .from("sitemap_external_link")
                .insert({ url: validUrl });
            } catch (error) {
              console.log(error.message, "external links");
            }
          }
        }
      });
    }
  } catch (error) {
    // Handle other errors
    try {
      await supabase.from("sitemap_internal_link").upsert(
        { page_url: url, status: true, message: error.message },
        {
          onConflict: ["page_url"],
          updateColumns: ["status", "message"],
        }
      );
    } catch (error) {
      console.log(error.message, "error internal link");
    }

    // console.log(response.error, "intenal page error supabase");
  }
};
let locCounter = 1;
const locUrlExtractor = async (currentUrl) => {
  let links = [];
  try {
    const response = await axios.get(currentUrl);
    let $ = cheerio.load(response.data);
    const locUrls = $("loc");
    // console.log("Sitemap extract page No:", locCounter++);
    for (const locUrl of locUrls) {
      let link = $(locUrl).text();
      if (link.includes(".xml")) {
        const locLinks = await locUrlExtractor(link);
        if (locLinks?.length > 0) {
          links.push(...locLinks);
          locLinks.map((link) => {
            return { page_url: link };
          });
          await supabase
            .from("sitemap_internal_link")
            .upsert(locLinks, { onConflict: ["id"] });
        }
        for (const locLink of locLinks) {
          links.push(locLink);
        }
      } else {
        links.push(link);
        await supabase.from("sitemap_internal_link").insert({ page_url: link });
      }
    }
    return links;
  } catch (error) {
    console.log("locUrlExtractor Error :", error.message);
  }

  return links;
};
const processWithPages = async () => {
  let run = true;
  console.log(run, "run");
  let crawlCounter = 2;
  while (run == true) {
    try {
      const { data, error } = await supabase
        .from("sitemap_internal_link")
        .select()
        .eq("status", false)
        .eq("message", "pending")
        .order("created_at", { ascending: true })
        .limit(10);
      //   console.log(response);
      if (data?.length > 0) {
        for (const link of data) {
          // console.log(link.page_url, "pageUrl");

          await crawl({
            url: link.page_url,
            ignore: "/search",
          });
          console.log("crawl end for start", crawlCounter++);
        }
      } else if (data?.length == 0 && !error) {
        console.log(response, "response");
        run = false;
      }
    } catch (e) {
      console.log(e.message, "get internal link");
    }
  }
  console.log("end");
};
(async () => {
  if (process.argv.length > 2) {
    let run = false;
    const url = `https://${process.argv[2]}/robots.txt`;
    const response = await axios.get(url);
    const sitemapUrls = response.data
      .match(/Sitemap:\s*(\S+)/g)
      .map((match) => match.split(": ")[1]);
    if (sitemapUrls?.length > 0) {
      for (const sitemapUrl of sitemapUrls) {
        locUrlExtractor(sitemapUrl);
        run = true;
      }
      setTimeout(processWithPages, 10000);
    } else {
      console.log("No sitemap found");
    }
  } else {
    console.log("no url found");
  }
})();
