const axios = require("axios");
const cheerio = require("cheerio");
const { supabase } = require("../config/config");
let counter = 1;
const locUrlExtractor = async (currentUrl, domain) => {
  let links = [];
  try {
    if (!currentUrl.includes("xml")) {
      return links;
    }
    const response = await axios.get(currentUrl);
    let $ = cheerio.load(response.data);
    console.log(`crawling at Page no : ${counter++}\n------------------------`);
    const locUrls = $("loc");
    if (locUrls?.length > 0) {
      for (const locUrl of locUrls) {
        let link = $(locUrl).text();
        // console.log(link, ">>>>>>>>");
        if (link.includes(domain)) {
          if (link.includes(".xml")) {
            const locLinks = await locUrlExtractor(link, domain);
            if (locLinks?.length > 0) {
              for (const locLink of locLinks) {
                links.push(locLink);
                const { data } = await supabase
                  .from("crawling_internal_link")
                  .insert({ page_url: locLink });
                // console.log(data, "data.........");
              }
            }
          } else {
            links.push(link);
            const { data } = await supabase
              .from("crawling_internal_link")
              .insert({ page_url: link });
            // console.log(data, "data.........");
          }
        }
      }
    }
  } catch (error) {
    console.log("locUrlExtractor Error :", error.message);
  }
  return links;
};

if (process.argv.length > 2) {
  const baseUrl = `https://${process.argv[2]}/sitemap.xml`;
  const domain = new URL(baseUrl).hostname.split(".").slice(-2).join(".");
  console.log(baseUrl, "baseurl");

  locUrlExtractor(baseUrl, domain)
    .then((reuslt) => {
      console.log(reuslt, "<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>");
    })
    .catch((e) => console.log(e.message));
} else {
  console.log("No url found.");
}
