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
const checkLinkStatus = async (url) => {
  try {
    const response = await axios.head(url);
    return response.status;
  } catch (error) {
    return error.response ? error.response.data : 0;
  }
};

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
    // console.log(response, ">>>>>>>>>>>>");
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
            // console.log(link, ">>>>>>>>>>>>>");
            let linkHostname = urlParser.parse(link).hostname;
            if (linkHostname?.startsWith("www.")) {
              linkHostname = linkHostname.replace(/^www\./, "");
            }
            const validUrl = validDomain(linkHostname);
            const { data } = await supabase
              .from("crawling_external_link")
              .select()
              .eq("url", validUrl);
            if (!data?.length) {
              const linkStatus = await checkLinkStatus(validUrl);
              await supabase
                .from("crawling_external_link")
                .insert({ url: validUrl, status_code: linkStatus });

              //   if (linkStatus != 200) {
              //     if (!seenUrls[validUrl]) {
              //       seenUrls[validUrl] = true;
              //       const domainForFilter = new URL(validUrl).hostname;
              //       if (brokenUrl?.includes(domainForFilter)) {
              //         brokenUrl.push(domainForFilter);
              //         console.log(domainForFilter, "broken");
              //       }
              //     }
              //   }

              // check status code
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
          if (pages?.includes(link)) {
            await supabase
              .from("crawling_internal_link")
              .insert({ page_url: link });
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
    if (error.response && error.response.status === 400) {
      // Handle 400 Bad Request error
      await supabase.from("crawling_internal_link").insert({
        page_url: url,
        status_code: 400,
        message: "Error: Bad Request error",
      });
      //   console.log(data, ".........");
      //   console.error(`Error for URL: ${url}`);
      //   console.error(`Error: ${error.message}`);
    } else if (error.response && error.response.status === 401) {
      // Handle 401 Unauthorized error
      await supabase.from("crawling_internal_link").insert({
        page_url: url,
        status_code: 401,
        message: "Error: Unauthorized error",
      });
      //   console.log(data, ".........");

      //   console.error(`Error for URL: ${url}`);
      //   console.error(`Error: ${error.message}`);
    } else if (error.response && error.response.status === 403) {
      // Handle 403 Forbidden error
      await supabase.from("crawling_internal_link").insert({
        page_url: url,
        status_code: 403,
        message: "Error: Forbidden error",
      });
      //   console.log(data, ".........");

      //   console.error(`Error for URL: ${url}`);
      //   console.error(`Error: ${error.message}`);
    } else if (error.response && error.response.status === 404) {
      // Handle 404 Not Found error
      await supabase.from("crawling_internal_link").insert({
        page_url: url,
        status_code: 404,
        message: "Error: Not Found error",
      });
      //   console.log(data, ".........");

      //   console.error(`Error for URL: ${url}`);
      //   console.error(`Error: ${error.message}`);
    } else if (error.response && error.response.status === 500) {
      // Handle 500 Internal Server Error
      await supabase.from("crawling_internal_link").insert({
        page_url: url,
        status_code: 500,
        message: "Error: Internal server error",
      });
      //   console.log(data, ".........");

      //   console.error(`Error for URL: ${url}`);
      //   console.error(`Error: ${error.message}`);
    } else if (error.response && error.response.status === 502) {
      // Handle 502 Bad Gateway Error
      await supabase.from("crawling_internal_link").insert({
        page_url: url,
        status_code: 502,
        message: "Error: Bad Gateway error",
      });
      //   console.log(data, ".........");
      //   console.error(`Error for URL: ${url}`);
      //   console.error(`Error: ${error.message}`);
    } else if (error.response && error.response.status === 503) {
      // Handle 503 Service Unavailable Error
      await supabase.from("crawling_internal_link").insert({
        page_url: url,
        status_code: 503,
        message: "Error: Service Unavailable error",
      });
      //   console.log(data, ".........");
      //   console.error(`Error for URL: ${url}`);
      //   console.error(`Error: ${error.message}`);
    } else {
      // Handle other errors
      await supabase.from("crawling_internal_link").insert({
        page_url: url,
        message: `"Error:" ${error.message}`,
      });
    }
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
