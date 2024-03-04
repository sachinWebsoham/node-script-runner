const axios = require("axios");
const cheerio = require("cheerio");
const { supabase } = require("../config/config");
let counter = 1;
const headers = {
  "User-Agent":
    "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0; SLCC2; .NET CLR 2.0.50727; .NET4.0C; .NET4.0E)",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
};
let links = [];

const locUrlExtractor = async (currentUrl) => {
  let pages = [];
  try {
    const response = await axios.get(currentUrl, headers);
    let $ = cheerio.load(response.data);
    console.log(`crawling at Page no : ${counter++}\n------------------------`);
    const xmlPages = $("loc")
      .map((i, loc) => $(loc).text())
      .get();
    if (xmlPages?.length > 0) {
      for (const xmlPage of xmlPages) {
        // console.log(link, ">>>>>>>>");
        if (xmlPage.includes(".xml")) {
          const response = await axios.get(xmlPage);
          const $ = cheerio.load(response.data);
          const xmlPages2 = $("loc")
            .map((i, loc) => $(loc).text())
            .get();
          if (xmlPages2?.length > 0) {
            for (const xmlPage2 of xmlPages2) {
              if (xmlPage2.includes(".xml")) {
                const response = await axios.get(xmlPage2);
                const $ = cheerio.load(response.data);
                const xmlPages3 = $("loc")
                  .map((i, loc) => $(loc).text())
                  .get();
                if (xmlPages3?.length > 0) {
                  pages.push(...xmlPages3);
                  await supabase
                    .from("sitemap_internal_link")
                    .upsert(xmlPages3, { onConflict: ["id"] });
                }
              } else {
                pages.push(xmlPage2);
                await supabase
                  .from("sitemap_internal_link")
                  .insert({ page_url: xmlPage2 });
              }
            }
          }
        } else {
          pages.push(xmlPage);
          await supabase
            .from("sitemap_internal_link")
            .insert({ page_url: xmlPage });
        }
      }
    }
  } catch (error) {
    console.log("locUrlExtractor Error :", error.message);
  }
  return pages;
};

if (process.argv.length > 2) {
  const baseUrl = `https://${process.argv[2]}/sitemap.xml`;
  const domain = new URL(baseUrl).hostname.split(".").slice(-2).join(".");
  console.log(baseUrl, "baseurl");

  locUrlExtractor(baseUrl)
    .then(async (result) => {
      result.map((link) => {
        return { page_url: link };
      });
      const uniqueArray = [...new Set(result)];
      console.log(uniqueArray.length, "data");
    })
    .catch((err) => {
      console.log(err.message, "err");
    });
} else {
  console.log("No url found.");
}
