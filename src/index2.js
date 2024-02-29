const { supabase } = require("../config/config");
const cheerio = require("cheerio");
const TLDs = require("./tldList");
const ccLTD = require("./cctldList");
const urlParser = require("url");
const axios = require("axios");
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
let forpages = 1;

const extractExternalLink = async (url) => {
  try {
    const { host, protocol } = urlParser.parse(url);
    const response = await axios.get(url);
    const contentType = response.headers["content-type"];

    if (!contentType.includes("text/html")) return;
    const $ = cheerio.load(response.data);

    const links = $("a")
      .map((i, link) => link.attribs.href)
      .get();
    await supabase.from("domain_page").upsert(
      { page_url: url, status: true },
      {
        onConflict: ["page_url"],
        updateColumns: ["status"],
      }
    );
    if (links?.length > 0) {
      console.log(`page_done: ${forpages++}`);
      links
        .filter((link) => !link.includes(host) && link.startsWith(protocol))
        .map(async (link) => {
          let linkHostname = urlParser.parse(link).hostname;
          if (linkHostname?.startsWith("www.")) {
            linkHostname = linkHostname.replace(/^www\./, "");
          }
          const validUrl = validDomain(linkHostname);
          await supabase
            .from("crawling_external_link")
            .insert({ url: validUrl });
          // console.log(validUrl, ">>>>>>>>>>>>>.");
        });
    }
  } catch (error) {
    // console.log(error.message);
    // console.log(url, "url");
    await supabase.from("domain_page").insert({
      page_url: url,
      message: `"Error:" ${error.message}`,
    });
  }
};
const timer = 1000 * 60 * 6;

const batchSize = 1000;
let offset = 0;
let counter = 1;
const fetchData = async () => {
  try {
    const { data } = await supabase
      .from("domain_page")
      .select("*")
      .order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (data?.length !== 0) {
      offset += batchSize;
      console.log(`crawlPages: ${offset} At Page ${counter++}`);
      data.map(async (object) => {
        extractExternalLink(object.page_url);
      });
    } else {
      return;
    }
  } catch (error) {
    // console.log(error.message);
  }
};
fetchData();
setInterval(fetchData, timer);
