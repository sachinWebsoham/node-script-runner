const cheerio = require("cheerio");
const axios = require("axios");
const urlParser = require("url");
const { supabase } = require("../config/config");
const { user_agent } = require("./user-agent");
const TLDs = require("./tldList");
const ccLTD = require("./cctldList");
const headers = {
  "User-Agent": user_agent[Math.floor(Math.random() * user_agent.length)],
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
};

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

const seenUrls = new Set();
const pages = [];

const axiosInstance = axios.create({ headers });

const validDomain = (domain) => {
  let validDomain;
  try {
    const domainPart = domain.split(".").filter((part) => part !== "");
    const partLength = domainPart.length;
    switch (true) {
      case partLength == 2 &&
        (TLDs.includes(domainPart[partLength - 1]) ||
          ccLTD.includes(domainPart[partLength - 1])):
        validDomain = `https://${domainPart.join(".")}`;
        break;
      case partLength == 3 &&
        ccLTD.includes(domainPart[partLength - 1]) &&
        TLDs.includes(domainPart[partLength - 2]):
        validDomain = `https://${domainPart.join(".")}`;
        break;
      case partLength == 3 && TLDs.includes(domainPart[partLength - 1]):
        validDomain = `https://${domainPart.slice(1).join(".")}`;
        break;
      case partLength == 3 && ccLTD.includes(domainPart[partLength - 1]):
        validDomain = `https://${domainPart.slice(1).join(".")}`;
        break;
      case partLength > 3 &&
        ccLTD.includes(domainPart[partLength - 1]) &&
        TLDs.includes(domainPart[partLength - 2]):
        const startIndex = Math.max(0, partLength - 3);
        validDomain = `https://${domainPart.slice(startIndex).join(".")}`;
        break;
      case partLength > 3 && ccLTD.includes(domainPart[partLength - 1]):
        const startIndex1 = Math.max(0, partLength - 2);
        validDomain = `https://${domainPart.slice(startIndex1).join(".")}`;
        break;
      case partLength > 3 && TLDs.includes(domainPart[partLength - 1]):
        const startIndex2 = Math.max(0, partLength - 2);
        validDomain = `https://${domainPart.slice(startIndex2).join(".")}`;
        break;
      default:
        validDomain = "Invalid domain";
    }
    return validDomain;
  } catch (error) {
    // console.log("Error-validDomain:", error.message);
  }
};

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

const crawl = async ({ url, ignore }) => {
  try {
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    const { host, protocol } = urlParser.parse(url);
    const response = await axiosInstance.get(url);

    const contentType = response.headers["content-type"];
    if (!contentType.includes("text/html")) return;

    const $ = cheerio.load(response.data);
    const links = $("a")
      .map((i, link) => link.attribs.href)
      .get();

    // ... (unchanged)

    await supabase.from("crawling_internal_link").upsert(
      { page_url: url, status: true },
      {
        onConflict: ["page_url"],
        updateColumns: ["status"],
      }
    );

    console.log(`Crawling At Page no.: ${counter++}\n____________________`);

    if (links?.length > 0) {
      const externalLinks = links.filter(
        (link) => !link.includes(host) && link.startsWith(protocol)
      );

      await Promise.all(
        externalLinks.map(async (link) => {
          const linkHostname = urlParser
            .parse(link)
            .hostname.replace(/^www\./, "");
          const validUrl = validDomain(linkHostname);
          if (validUrl) {
            await supabase
              .from("crawling_external_link")
              .insert({ url: validUrl });
          }
        })
      );

      // ... (unchanged)

      await Promise.all(
        internalLink.map(async (link) => {
          const endsWithignoreExtention = ignoreExtention.some((extension) =>
            link.toLowerCase().endsWith(extension)
          );
          if (!endsWithignoreExtention && !pages.includes(link)) {
            await supabase
              .from("crawling_internal_link")
              .insert({ page_url: link });
          }
        })
      );

      await Promise.all(
        internalLink.map((link) => crawl({ url: link, ignore }))
      );
    }
  } catch (error) {
    // ... (unchanged)
  }
};

if (process.argv.length > 2) {
  const url = process.argv[2];
  crawl({ url, ignore: "/search" });
} else {
  console.log("No url found.");
}
