const cheerio = require("cheerio");
const axios = require("axios");
const urlParser = require("url");
const { supabase } = require("../config/config");
const TLDs = require("./tldList");
const ccLTD = require("./cctldList");
const ignoreExtention = [
  "webp",
  "mp3",
  "wav",
  "m4a",
  "flac",
  "aac",
  "mp4",
  "avi",
  "mkv",
  "mov",
  "wmv",
  "jpeg",
  "jpg",
  "png",
  "gif",
  "tiff",
  "raw",
];

const seenUrls = {};
let pages = [];
let brokenUrl = [];
const getUrl = (link, host, defaultProtocol = "https://") => {
  try {
    pages.push(link);
    if (link.includes("http")) {
      //   console.log("http", link);
      return link;
    } else if (link.startsWith("//")) {
      //   console.log("startsWith", `${defaultProtocol}//${link}`);
      return `${defaultProtocol}${link}`;
    } else if (link.startsWith("/")) {
      return `${defaultProtocol}${host}/${link}`;
    }
  } catch (error) {
    // console.log(error.message);
  }
};
let counter = 1;
const crawl = async ({ url, ignore }) => {
  try {
    if (seenUrls[url]) return;
    seenUrls[url] = true;
    const { host, protocol } = urlParser.parse(url);
    const response = await axios.get(url);
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
      const internalLinkSet = new Set(
        links.filter((link) => link.includes(host) && !link.includes(ignore))
      );

      const internalLink = Array.from(internalLinkSet);

      internalLink.forEach(async (link) => {
        const endsWithignoreExtention = ignoreExtention.some((extension) =>
          link.toLowerCase().endsWith(extension)
        );
        if (!endsWithignoreExtention) {
          if (pages?.includes(link)) {
            await supabase
              .from("crawling_internal_link")
              .insert({ page_url: link });
          }
        }
      });
      internalLink.forEach((link) => {
        crawl({
          url: getUrl(link, host, protocol),
          ignore,
        });
      });
    }
    return;
  } catch (error) {
    // Handle other errors
    await supabase.from("crawling_internal_link").insert({
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
  }).then(() => {
    // console.log("running");
  });
} else {
  console.log("No url found.");
}
