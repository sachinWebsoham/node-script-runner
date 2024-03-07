const puppeteer = require("puppeteer");
const { supabase } = require("../config/config");
const path = require("path");
const fs = require("fs");
const csvToJson = require("csvtojson");

(async () => {
  try {
    const currentDirecotry = process.cwd();
    const downloadPath = path.join(currentDirecotry, "downloads");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(
      "https://www.namecheap.com/domains/registration/results/?domain=&type=beast"
    );
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });
    // await enterDomain(page, downloadPath);
    let run = true;

    let domainLength = 0;
    while (run == true) {
      try {
        await page.goto(
          "https://www.namecheap.com/domains/registration/results/?domain=&type=beast"
        );
        const { data, error } = await supabase
          .from("sitemap_external_domain")
          .select()
          .eq("status", false)
          .neq("Available", "pending")
          .limit(50);
        //   console.log(response);
        if (data?.length > 0) {
          const udata = data.map((item) => ({
            url: item.url,
            Available: "pending",
            Premium: item.Premium,
            Price: item.Price,
            status: true,
          }));
          await supabase
            .from("sitemap_external_domain")
            .upsert(udata, { onConflict: ["url"] });
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const url = data.map((link) => {
            return link.url;
          });
          // console.log(url, "url");
          await page.waitForSelector(
            "#react-nc-search > div > section > div > form > button",
            { timeout: 60000 }
          );
          for (const link of url) {
            await page.type("#beast-keywords-input", link);
            await page.keyboard.press("Enter");
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await page.click(
            "#react-nc-search > div > section > div > form > button"
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
          await page.click(
            "#search-results > header > div.results-actions > div > button.export"
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
          const files = fs.readdirSync(downloadPath);

          const originalFileName = files[0];
          // console.log(originalFileName, "original name");
          // console.log(downloadPath, "downloadpath");
          const csvfilepath = path.join(downloadPath, originalFileName);
          // console.log(csvfilepath, "csv file path");
          const jsonArray = await csvToJson().fromFile(csvfilepath);
          // console.log(jsonArray, "josn array");
          const forUpdateData = jsonArray.map((item) => ({
            url: `https://${item.Domain}`,
            Available: item.Available,
            Premium: item.Premium,
            Price: item.Price,
            status: true,
          }));
          await new Promise((resolve) => setTimeout(resolve, 3000));
          try {
            await supabase
              .from("sitemap_external_domain")
              .upsert(forUpdateData, { onConflict: ["url"] });
            console.log(
              "Checked Domains",
              (domainLength += forUpdateData.length)
            );
          } catch (error) {
            console.log("Error while update", error.message);
          }
          fs.unlinkSync(path.join(downloadPath, "results.csv"));
          reEnter = true;
        } else if (data?.length == 0 && !error) {
          run = false;
        }
      } catch (e) {
        console.log("Error while loop", e.message);
      }
    }
  } catch (error) {
    console.log(error, "error <><><>");
  }
})();
