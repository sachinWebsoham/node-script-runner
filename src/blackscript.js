const request = require("request");
const cheerio = require("cheerio");

// Load the sitemap page
request("https://anytimefitness/sitemap.xml", function (error, response, xml) {
  if (!error && response.statusCode == 200) {
    // Parse the XML content of the sitemap page
    const $ = cheerio.load(xml, { xmlMode: true });

    // Extract the URLs from the parsed XML
    const urls = $("url loc")
      .map(function () {
        return $(this).text();
      })
      .get();

    // Iterate through the extracted URLs
    urls.forEach(function (url) {
      // Make a request to the URL
      request(url, function (error, response, html) {
        if (!error && response.statusCode == 200) {
          // Parse the HTML content of the page
          const $ = cheerio.load(html);

          // Extract the desired information using Cheerio selectors
          const title = $("title").text();
          const content = $("div.content").text();

          // Log the extracted information
          console.log(`Title: ${title}`);
          console.log(`Content: ${content}`);
        }
      });
    });
  }
});
