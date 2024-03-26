const cheerio = require("cheerio");
const axios = require("axios");
const urlParser = require("url");
const { websohambase, supabase } = require("../config/config");
const { validDomain, getRandomUserAgent } = require("../utils/index.js");
const redis = require("../config/redis.js");

function generateKey() {
  // Generate a random number between 10000 and 99999 (inclusive)
  return `${Math.floor(Math.random() * 90000) + 10000}-updates`;
}
const keyForupdates = generateKey();

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
// const seenUrls = {};
let counter = 1;
const crawl = async ({ url, ignore, domain }) => {
  try {
    // if (seenUrls[url]) return;
    // seenUrls[url] = true;
    const { host, protocol } = urlParser.parse(url);
    // console.log(url, ">>>>>>>>>");
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.get(url);
    const contentType = response.headers["content-type"];

    if (!contentType.includes("text/html")) return;
    const $ = cheerio.load(response.data);

    const links = $("a")
      .map((i, link) => link.attribs.href)
      .get();
    await redis.sadd(
      keyForupdates,
      JSON.stringify({
        page_url: url,
        status: true,
        message: "done",
        updated_at: new Date().toISOString(),
      })
    );
    // console.log(error, "update internal link");
    console.log(`Crawling At Page no.: ${counter++}`);

    if (links?.length > 0) {
      links.forEach(async (link) => {
        if (!link.includes(host) && link.startsWith(protocol)) {
          let linkHostname = urlParser.parse(link).hostname;
          if (linkHostname?.startsWith("www.")) {
            linkHostname = linkHostname.replace(/^www\./, "");
          }
          const validUrl = validDomain(linkHostname);
          if (validUrl && validUrl !== "Invalid domain") {
            const check = await redis.sismember("externalLink", validUrl);
            if (check == 0) {
              console.log(validUrl);
              await redis.sadd("externalLink", validUrl);
              try {
                await websohambase
                  .from("sitemap_external_link")
                  .insert({ url: validUrl, domain: domain });
              } catch (error) {
                console.log(error.message, "external links");
              }
            }
          }
        }
      });
    }
  } catch (error) {
    // Handle other errors
    try {
      await websohambase.from("sitemap_internal_link").upsert(
        {
          page_url: url,
          status: true,
          message: error.message,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: ["page_url"],
          updateColumns: ["status", "message", "updated_at"],
        }
      );
    } catch (error) {
      console.log(error.message, "error internal link");
    }

    // console.log(response.error, "intenal page error websohambase");
  }
};
const processWithPages = async (host) => {
  let run = true;
  let crawlCounter = 1;
  while (run == true) {
    try {
      console.log("start");
      const { data, error } = await websohambase
        .from("sitemap_internal_link")
        .select()
        .eq("status", false)
        .eq("message", "pending")
        .eq("domain", host)
        .order("created_at", { ascending: true })
        .limit(5);
      // console.log(data, "<<<<<<");
      if (data?.length > 0) {
        // when data get by db then we remove all update pages value in redis
        await redis.del(keyForupdates);
        const forUpdate = data.map((item) => ({
          page_url: item.page_url,
          message: "inProgress",
          updated_at: new Date().toISOString(),
        }));
        await websohambase
          .from("sitemap_internal_link")
          .upsert(forUpdate, { onConflict: ["page_url"] });
        for (const link of data) {
          await crawl({
            url: link.page_url,
            ignore: "/search",
            domain: link.domain,
          });
          console.log("crawl end for start", crawlCounter++);
        }
        try {
          const redisUpdates = await redis.smembers(keyForupdates);
          const saveData = redisUpdates.map((item) => {
            return JSON.parse(item);
          });
          // console.log(saveData, ">>>>");
          await websohambase
            .from("sitemap_internal_link")
            .upsert(saveData, { onConflict: ["page_url"] });
        } catch (error) {
          // console.log(error.message);
        }
      } else if (data?.length == 0 && !error) {
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
    const host = process.argv[2];
    const response = await websohambase.from("sitemap_external_link").select();
    response?.data.map((item) => {
      redis.sadd("externalLink", item.url);
    });
    await processWithPages(host);
  } else {
    console.log("no url found");
  }
})();
