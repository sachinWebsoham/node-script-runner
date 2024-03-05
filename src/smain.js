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
const { result } = require("lodash");

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
    try {
      await supabase
        .from("crawling_external_link")
        .upsert(externalLink, { onConflict: ["url"] });
      externalLink = [];
    } catch (error) {
      console.log(error.message, "external links");
    }
  } else {
    return;
  }
};
const seenUrls = {};
const seenExternalLink = {};

// for update internal link in supabase
// let internalLinks = [];
// const internalLinkAdd = async () => {
//   if (internalLinks?.length > 0) {
//     supabase
//       .from("crawling_internal_link")
//       .upsert(internalLinks, { onConflict: ["page_url"] })
//       .then(() => {
//         console.log("Internal Links Add");
//       });
//     internalLinks = [];
//   } else {
//     return;
//   }
// };

// for update error pages in supabase
let internalLinkError = [];
const errorInternalLinkAdd = async () => {
  if (internalLinkError?.length > 0) {
    const { error } = await supabase
      .from("crawling_internal_link")
      .upsert(internalLinkError, { onConflict: ["page_url"] });
    internalLinkError = [];
    // console.log(error, "internal pages supabse");
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
    // console.log(url, ">>>>>>>>>");
    const response = await axios.get(url, headers);
    const contentType = response.headers["content-type"];

    if (!contentType.includes("text/html")) return;
    const $ = cheerio.load(response.data);

    const links = $("a")
      .map((i, link) => link.attribs.href)
      .get();
    if (seenUrls[url]) {
      try {
        await supabase.from("crawling_internal_link").upsert(
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
                .from("crawling_external_link")
                .insert({ url: validUrl });
            } catch (error) {
              console.log(error.message, "external links");
            }
          }
        } else if (link.includes(host) && !link.includes(ignore)) {
          const url = getUrl(link, host, protocol);
          const endsWithIgnoreExtension = ignoreExtention.some((extension) =>
            url.toLowerCase().endsWith(extension)
          );
          if (!endsWithIgnoreExtension) {
            try {
              await supabase
                .from("crawling_internal_link")
                .insert({ page_url: url });
            } catch (error) {
              console.log(error.message, "insert internal link");
            }
          }
        }
      });
    }
  } catch (error) {
    // Handle other errors
    try {
      await supabase.from("crawling_internal_link").upsert(
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

const processWithPages = async () => {
  let run = true;
  console.log(run, "run");
  let crawlCounter = 2;
  while (run == true) {
    try {
      const { data, error } = await supabase
        .from("crawling_internal_link")
        .select()
        .eq("status", false)
        .eq("message", "pending")
        .order("created_at", { ascending: true })
        .limit(10);
      //   console.log(response);
      if (data?.length > 0) {
        for (const link of data) {
          console.log(link.page_url, "pageUrl");
          await crawl({
            url: link.page_url,
            ignore: "/search",
          });
          console.log("crawl end for start", crawlCounter++);
        }
        // console.log(data[0].page_url, "pageUrl");
        // await crawl({
        //   url: data[0].page_url,
        //   ignore: "/search",
        // });
        // console.log("crawl end for start", crawlCounter++);
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
    const url = process.argv[2];
    await crawl({
      url: url,
      ignore: "/search",
    });
    await processWithPages();
    console.log("end");
  } else {
    console.log("No url found.");
  }
})();
