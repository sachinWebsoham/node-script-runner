const cheerio = require("cheerio");
const axios = require("axios");
const urlParser = require("url");
const { supabase, websohambase } = require("../config/config");

let locCounter = 1;
const locUrlExtractor = async (currentUrl, host) => {
  try {
    const response = await axios.get(currentUrl);
    let $ = cheerio.load(response.data);
    const locUrls = $("loc");
    console.log(locUrls.length, ">>");
    console.log("Sitemap extract page No:", locCounter++);
    for (const locUrl of locUrls) {
      let link = $(locUrl).text();
      if (link.includes(".xml")) {
        await locUrlExtractor(link, host);
      } else {
        await websohambase
          .from("sitemap_internal_link")
          .insert({ page_url: link, domain: host });
      }
    }
    return;
  } catch (error) {
    console.log("locUrlExtractor Error :", error.message);
    await websohambase
      .from("sitemap_xml_link")
      .upsert({ page_url: currentUrl, message: error.message });
  }

  return;
};
(async () => {
  if (process.argv.length > 2) {
    const url = `https://${process.argv[2]}/robots.txt`;
    const { host } = urlParser.parse(url);
    const response = await axios.get(url);
    const matches = response.data.match(/Sitemap:\s*(\S+)/g);
    if (matches?.length > 0) {
      const sitemapUrls = matches.map((match) => match?.split(": ")[1]);
      if (sitemapUrls?.length > 0) {
        for (const sitemapUrl of sitemapUrls) {
          // console.log(host, "host");
          locUrlExtractor(sitemapUrl, host);
          run = true;
        }
      }
    }
    const sitemapUrlList = [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/sitemap.txt",
      "/sitemap/",
      "/wp-sitemap.xml",
      "/sitemap1.xml",
      "/blog-sitemap.xml",
      "/category-sitemap.xml",
      "/tag-sitemap.xml",
      "/sitemap.xml.gz",
      "/sitemap/sitemap.xml",
    ];
    let sitemapList = [];
    for (const sitemap of sitemapUrlList) {
      try {
        const url = `https://${process.argv[2]}/${sitemap}`;
        const response = await axios.get(url);
        if (response.status == 200) {
          sitemapList.push(url);
        }
      } catch (error) {
        // console.log(error.message);
      }
    }
    if (sitemapList?.length > 0) {
      // console.log(sitemapList, ">>>>>");
      for (const sitemap of sitemapList) {
        console.log(host, "host");
        locUrlExtractor(sitemap, host);
      }
    }
    process.exit(0);
  } else {
    console.log("no url found");
  }
})();
