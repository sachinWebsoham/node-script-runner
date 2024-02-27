const { JSDOM } = require("jsdom");
let allUrls = [];
const TLDs = require("./tldList");
const ccLTD = require("./cctldList");

const validDomain = (domain) => {
  let validDomain;
  const domainPart = domain.split(".").filter((part) => part !== "");
  const partLength = domainPart.length;
  switch (true) {
    case partLength == 2 &&
      (TLDs.includes(domainPart[partLength - 1]) ||
        ccLTD.includes(domainPart[partLength - 1])):
      validDomain = domainPart.join(".");
      break;
    case partLength == 3 &&
      ccLTD.includes(domainPart[partLength - 1]) &&
      TLDs.includes(domainPart[partLength - 2]):
      validDomain = domainPart.join(".");
      break;
    case partLength == 3 && TLDs.includes(domainPart[partLength - 1]):
      validDomain = domainPart.slice(1).join(".");
      break;
    case partLength == 3 && ccLTD.includes(domainPart[partLength - 1]):
      validDomain = domainPart.slice(1).join(".");
      break;
    case partLength > 3 &&
      ccLTD.includes(domainPart[partLength - 1]) &&
      TLDs.includes(domainPart[partLength - 2]):
      const startIndex = Math.max(0, parts.length - 3);
      validDomain = domainPart.slice(startIndex).join(".");
      break;
    case partLength > 3 && ccLTD.includes(domainPart[partLength - 1]):
      const startIndex1 = Math.max(0, parts.length - 2);
      validDomain = domainPart.slice(startIndex1).join(".");
      break;
    case partLength > 3 && TLDs.includes(domainPart[partLength - 1]):
      const startIndex2 = Math.max(0, parts.length - 2);
      validDomain = domainPart.slice(startIndex2).join(".");
      break;
    default:
      validDomain = "Invalid domain";
  }
  return validDomain;
};

function convertToStandardURL(url) {
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
}

function normalizeURL(urlString) {
  const urlObj = new URL(urlString);
  const hostPath = `${urlObj.hostname}${urlObj.pathname}`;
  if (hostPath.length > 0 && hostPath.slice(-1) === "/") {
    return hostPath.slice(0, -1);
  }
  return hostPath;
}

function getURLsFromHTML(htmlBody, baseURL) {
  let urls = [];
  let dom;

  const linkelements = dom.window.document.querySelectorAll("a");

  for (const linkelement of linkelements) {
    // if (linkelement.startsWith("www.")) {
    //   linkelement = linkelement.substring(4);
    // }
    // console.log(linkelement.hostname, ">>>>>>>>");
    if (linkelement.href.slice(0, 1) === "/") {
      try {
        const urlObj = new URL(`${baseURL}${linkelement.href}`);
        // console.log(urlObj.href, "linkelement");
        urls.push(urlObj.href);
      } catch (error) {
        // console.error(`error with reletive url : ${error.message}`);
      }
      //   urls.push(`${baseURL}${linkelement.href}`);
    } else {
      try {
        // console.log(baseURL, "baseurl");
        const urlObj = new URL(linkelement.href);
        const mainUrl = convertToStandardURL(urlObj.hostname);
        let compareBaseUrl;
        if (baseURL.endsWith("/")) {
          compareBaseUrl = baseURL.slice(0, -1);
          // console.log(compareBaseUrl, "compare");
        }
        if (compareBaseUrl !== mainUrl) {
          if (!allUrls.includes(mainUrl)) {
            // console.log(linkelement.hostname, "link");
            if (linkelement.hostname.startsWith("www.")) {
              const domain = linkelement.hostname.substring(4);
              // console.log(validDomain(domain), "domain");
            } else {
              // console.log(validDomain(linkelement.hostname), " eles domain");

              allUrls.push(linkelement.hostname);
            }
          }
        }
        urls.push(urlObj.href);
      } catch (error) {
        // console.error(`error with reletive url : ${error.message}`);
      }
    }
  }
  // console.log(allUrls, "urls");
  return urls;
}

const crawlPage = async (baseURL, currentUrl, pages) => {
  // console.log("activly crawling:", currentUrl);

  const currentUrlObj = new URL(currentUrl);
  const baseURLObj = new URL(baseURL);
  if (baseURLObj.hostname !== currentUrlObj.hostname) {
    return pages;
  }
  const normalizeCurrentURL = normalizeURL(currentUrl);
  if (pages[normalizeCurrentURL] > 0) {
    pages[normalizeCurrentURL]++;
    return pages;
  }
  pages[normalizeCurrentURL] = 1;
  // console.log(currentUrlObj, "obj");
  try {
    const res = await fetch(currentUrl);
    if (res.status > 399) {
      // console.log(
      //   `error in fetch with status code: ${res.status}, on page ${currentUrl}`
      // );
      return pages;
    }
    const contentType = res.headers.get("content-type");

    if (!contentType.includes("text/html")) {
      // console.log(
      //   `non html response, content type:: ${contentType}, on page ${currentUrl}`
      // );
      return pages;
    }
    // console.log(res.status, "stats");
    const htmlBody = await res.text();
    // console.log(htmlBody);
    const nextUrls = getURLsFromHTML(htmlBody, baseURL);
    for (const nextUrl of nextUrls) {
      pages = await crawlPage(baseURL, nextUrl, pages);
    }
  } catch (error) {
    // console.log(`error in fetch : ${error.message}, on page : ${currentUrl}`);
  }
  return pages;
};

const crawlPage2 = async (baseURL, currentUrl, allUrls) => {
  try {
    function checkURLExists(urlArray, urlToCheck) {
      for (let i = 0; i < urlArray.length; i++) {
        if (urlArray[i].C === urlToCheck) {
          return true; // URL exists
        }
      }
      return false; // URL does not exist
    }
    const currentUrlObj = new URL(currentUrl);
    const baseURLObj = new URL(baseURL);
    const normalizeCurrentURL = normalizeURL(currentUrl);
    if (currentUrlObj.hostname != baseURLObj.hostname) {
      const currentUrlRes = await fetch(currentUrl);
      if (currentUrlRes.status > 399) {
        const brokenUrl = {
          statusCode: currentUrlRes.status,
          url: currentUrlObj.hostname,
        };
        allUrls["brokenUrl"].push(brokenUrl);
      }
      allUrls["normalUrl"].push(currentUrlObj.hostname);
      return allUrls;
    } else {
      if (checkURLExists(allUrls["pages"], normalizeCurrentURL)) {
        allUrls["pages"].push(normalizeCurrentURL);
        const res = await fetch(currentUrl);
        if (res.status > 399) {
          const brokenUrl = {
            statusCode: res.status,
            url: currentUrlObj.hostname,
          };
          allUrls["brokenUrl"].push(brokenUrl);
          return allUrls;
        }
        const contentType = res.headers.get("content-type");
        if (contentType.includes("text/html")) {
          console.log("non html response");
        }
        const htmlBody = await res.text();
        const nextUrls = getURLsFromHTML(htmlBody, baseURL);
        for (const nextUrl of nextUrls) {
          allUrls = await crawlPage2(baseURL, nextUrl, allUrls);
        }
      }
      return allUrls;
    }
  } catch (error) {
    // console.log(`Error: crawlPage2 : ${error}`);
  }
};
module.exports = {
  normalizeURL,
  getURLsFromHTML,
  crawlPage,
  crawlPage2,
  allUrls,
};
