const axios = require("axios");
const cheerio = require("cheerio");
const { parse: parseUrl } = require("url");
const baseUrl = "https://mediagarh.com";
const domain = new URL(baseUrl).hostname.split(".").slice(-2).join(".");
const TLDs = require("./tldList");
const ccLTD = require("./cctldList");
let internalLinks = [];
let externalLinks = [];
let brokenLinks = [];
let onetime = true;
const convertToStandardURL = (url) => {
  // Check if the URL starts with "http://" or "https://"
  if (url.startsWith("http://www.")) {
    // If it starts with "http://www.", replace it with "https://www."
    url = url.replace("http://www.", "https://www.");
  } else if (url.startsWith("http://")) {
    // If it starts with "http://", replace it with "https://www."
    url = url.replace("http://", "https://www.");
  } else if (url.startsWith("www.")) {
    // If it starts with "www.", prepend "https://"
    url = "https://" + url;
  } else if (!url.startsWith("https://")) {
    // If it doesn't start with "https://", prepend "https://www."
    url = "https://www." + url;
  }
  return url;
};

const isValidDomain = (domain) => {
  let validDomain;
  try {
    const domainPart = domain.split(".").filter((part) => part !== "");
    const partLength = domainPart.length;
    switch (true) {
      case partLength == 2 &&
        (TLDs?.includes(domainPart[partLength - 1]) ||
          ccLTD?.includes(domainPart[partLength - 1])):
        validDomain = domainPart.join(".");
        break;
      case partLength == 3 &&
        ccLTD?.includes(domainPart[partLength - 1]) &&
        TLDs?.includes(domainPart[partLength - 2]):
        validDomain = domainPart.join(".");
        break;
      case partLength == 3 && TLDs?.includes(domainPart[partLength - 1]):
        validDomain = domainPart.slice(1).join(".");
        break;
      case partLength == 3 && ccLTD?.includes(domainPart[partLength - 1]):
        validDomain = domainPart.slice(1).join(".");
        break;
      case partLength > 3 &&
        ccLTD?.includes(domainPart[partLength - 1]) &&
        TLDs?.includes(domainPart[partLength - 2]):
        const startIndex = Math.max(0, partLength - 3);
        validDomain = domainPart.slice(startIndex).join(".");
        break;
      case partLength > 3 && ccLTD?.includes(domainPart[partLength - 1]):
        const startIndex1 = Math.max(0, partLength - 2);
        validDomain = domainPart.slice(startIndex1).join(".");
        break;
      case partLength > 3 && TLDs?.includes(domainPart[partLength - 1]):
        const startIndex2 = Math.max(0, partLength - 2);
        validDomain = domainPart.slice(startIndex2).join(".");
        break;
      default:
        validDomain = "Invalid";
    }
    return validDomain;
  } catch (error) {
    console.log("Error-validDomain:", error.message);
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
// (async () => {
//   const response = await axios.get("https://mediagarh.com");
// })();
let counter = 1;
let tempPagesCount = 1;
async function crawlWebsite(currentUrl, baseUrl, pages) {
  let tempPages = [];
  try {
    const response = await axios.get(currentUrl);
    const contentType = response.headers["content-type"];

    // console.log(response.headers["content-type"], "response");

    if (!contentType.includes("text/html")) {
      console.log("____________________________________________________");
      return pages;
    }
    const $ = cheerio.load(response.data);

    $("a").each(async (index, element) => {
      const href = $(element).attr("href");

      if (
        href &&
        !href.includes("webp") &&
        !href.includes("jpg") &&
        !href.includes("jpeg")
      ) {
        const parsedUrl = parseUrl(href);
        if (href.startsWith("/")) {
          try {
            const pageUrl = convertToStandardURL(`${baseUrl}${href}`);
            if (!pages?.includes(pageUrl)) {
              pages.push(pageUrl);
              tempPages.push(pageUrl);
            }
          } catch (error) {
            console.log("Error-startswith:", error.message);
          }
        } else if (href.includes(domain)) {
          const standardHref = convertToStandardURL(href);
          // console.log(standardHref, "standardHreffffffffffff");
          // console.log(pages, "pagessss");
          if (!pages?.includes(standardHref) && baseUrl !== standardHref) {
            tempPages.push(standardHref);
            pages.push(standardHref);
          }
        }
        // else {
        // if (parsedUrl?.hostname) {
        //   const validUrl = isValidDomain(parsedUrl.hostname);
        //   if (validUrl !== "Invalid" && validUrl !== "") {
        //     const validStandardUrl = convertToStandardURL(validUrl);

        //     if (!externalLinks.includes(validStandardUrl)) {
        //       externalLinks.push(validStandardUrl);
        //       const data = await checkLinkStatus(validStandardUrl);
        //       if (data !== 200) {
        //         brokenLinks.push(validStandardUrl);
        //       }
        //     }
        //   }
        // }
        // }
        // Check if the link is broken
      }
    });
    internalLinks = internalLinks.filter((element) => element !== currentUrl);
    if (tempPages?.length > 0) {
      tempPagesCount = tempPagesCount + tempPages.length;
      // tempPagesCount += tempPages.length;
      console.log(tempPagesCount, "temppage");

      for (const page of tempPages) {
        if (!internalLinks?.includes(page)) {
          internalLinks.push(page);
          console.log(counter++, "count");
          // console.log(page, "page><");
          pages = await crawlWebsite(page, baseUrl, pages);
        }
      }
    } else {
      console.log("__________________________");
      return pages;
    }
    // console.log(internalLinks, "internal");
    console.log(internalLinks.length, "length");

    // if (!pages?.includes(currentUrl)) {
    //   console.log("not available");
    //   console.log(internalLinks, "length");
    //   for (const link of internalLinks) {
    //     console.log(counter++, "count");
    //     console.log(link, "<<<<<<<<<<<<<<<<<<");
    //     // console.log(pages, "pages");
    //     pages = await crawlWebsite(link, baseUrl, pages);
    //   }
    // } else {
    //   console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    //   return pages;
    // }
    return pages;
  } catch (error) {
    console.error("Error: crawlWebsite", error.message);
  }
  return pages;
}

// checkLinkStatus("https://www.dosndf.com").then((r) => console.log(r));

// // Replace 'https://example.com' with the desired website URL to crawl
crawlWebsite(baseUrl, baseUrl, []).then((result) => {
  console.log(result, ">>>>>>>>>>>>>>");
  // console.log(externalLinks, "externallink");
});
