const puppeteer = require("puppeteer");
const { websohambase } = require("../config/config");
const path = require("path");
const fs = require("fs");
const csvToJson = require("csvtojson");

(async () => {
  try {
    const currentDirecotry = process.cwd();
    const downloadPath = path.join(currentDirecotry, "downloads");
    const browser = await puppeteer.launch({
      headless: true,
      // args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });
    let run = true;
    let datalength = 0;
    let domainLength = 0;
    while (run == true) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        await page.goto(
          "https://www.namecheap.com/domains/registration/results/?domain=&type=beast"
        );
        const { data, error } = await websohambase
          .from("sitemap_external_link")
          .select()
          .eq("status", false)
          .limit(80);
        if (data?.length > 0) {
          const upd = data.map((item) => ({
            url: item.url,
            status: "pending",
          }));
          await websohambase
            .from("sitemap_external_link")
            .upsert(upd, { onConflict: ["url"] });
          console.log(
            "External Link",
            `${(datalength += data.length)} + ${data.length}`
          );
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const url = data.map((link) => {
            if (link.url?.includes("http")) return link.url;
          });
          const urlString = url.join(" ");
          await page.waitForSelector(
            "#react-nc-search > div > section > div > form > button",
            { timeout: 60000 }
          );
          await page.type("#beast-keywords-input", `${urlString} `);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await page.click(
            "#react-nc-search > div > section > div > form > button"
          );
          await page.waitForSelector(
            "#search-results > header > div.results-actions > div > button.export",
            { timeout: 60000 }
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
          await page.click(
            "#search-results > header > div.results-actions > div > button.export"
          );
          await new Promise((resolve) => setTimeout(resolve, 20000));
          const files = fs.readdirSync(downloadPath);

          const originalFileName = files[0];
          console.log(originalFileName, "original name");
          // console.log(downloadPath, "downloadpath");
          const csvfilepath = path.join(downloadPath, originalFileName);
          // console.log(csvfilepath, "csv file path");
          const jsonArray = await csvToJson().fromFile(csvfilepath);
          // console.log(jsonArray, "josn array");
          const forUpdate = jsonArray.map((item) => ({
            url: `https://${item.Domain}`,
            Available: item.Available,
            Premium: item.Premium,
            Price: item.Price,
            status: true,
          }));
          await websohambase
            .from("sitemap_external_link")
            .upsert(forUpdate, { onConflict: ["url"] });
          // jsonArray.map(async (item) => {
          //   try {
          //     if (item.Available == "taken") {
          //       await websohambase.from("sitemap_taken_domain").insert({
          //         url: `https://${item.Domain}`,
          //         status: item.Available,
          //       });
          //     } else if (item.Available == "available") {
          //       await websohambase.from("sitemap_available_domain").insert({
          //         url: `https://${item.Domain}`,
          //         Premium: item.Premium,
          //         Price: item.Price,
          //         status: item.Available,
          //       });
          //     }
          //   } catch (error) {
          //     console.log("Error while update", error.message);
          //   }
          // });
          console.log("Checked Domains", (domainLength += forUpdate.length));
          await new Promise((resolve) => setTimeout(resolve, 3000));
          fs.unlinkSync(path.join(downloadPath, "results.csv"));
        } else if (data?.length == 0 && !error) {
          run = "runForPending";
        }
      } catch (e) {
        console.log("Error while loop", e.message);
      }
    }
    while (run == "runForPending") {
      try {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await page.goto(
          "https://www.namecheap.com/domains/registration/results/?domain=&type=beast"
        );
        const { data, error } = await websohambase
          .from("sitemap_external_link")
          .select()
          .eq("status", "pending")
          .limit(100);
        if (data?.length > 0) {
          const upd = data.map((item) => ({
            url: item.url,
            status: "pending",
          }));
          await websohambase
            .from("sitemap_external_link")
            .upsert(upd, { onConflict: ["url"] });
          console.log("External Link pending", data?.length);
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const url = data.map((link) => {
            if (link.url?.includes("http")) return link.url;
          });
          const urlString = url.join(" ");
          console.log(urlString);
          await page.waitForSelector(
            "#react-nc-search > div > section > div > form > button",
            { timeout: 60000 }
          );
          await page.type("#beast-keywords-input", `${urlString} `);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await page.click(
            "#react-nc-search > div > section > div > form > button"
          );
          await page.waitForSelector(
            "#search-results > header > div.results-actions > div > button.export",
            { timeout: 60000 }
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
          await page.click(
            "#search-results > header > div.results-actions > div > button.export"
          );
          await new Promise((resolve) => setTimeout(resolve, 20000));
          const files = fs.readdirSync(downloadPath);

          const originalFileName = files[0];
          console.log(originalFileName, "original name");
          // console.log(downloadPath, "downloadpath");
          const csvfilepath = path.join(downloadPath, originalFileName);
          // console.log(csvfilepath, "csv file path");
          const jsonArray = await csvToJson().fromFile(csvfilepath);
          // console.log(jsonArray, "josn array");
          const forUpdate = jsonArray.map((item) => ({
            url: `https://${item.Domain}`,
            Available: item.Available,
            Premium: item.Premium,
            Price: item.Price,
            status: true,
          }));
          await websohambase
            .from("sitemap_external_link")
            .upsert(forUpdate, { onConflict: ["url"] });
          // jsonArray.map(async (item) => {
          //   try {
          //     if (item.Available == "taken") {
          //       await websohambase.from("sitemap_taken_domain").insert({
          //         url: `https://${item.Domain}`,
          //         status: item.Available,
          //       });
          //     } else if (item.Available == "available") {
          //       await websohambase.from("sitemap_available_domain").insert({
          //         url: `https://${item.Domain}`,
          //         Premium: item.Premium,
          //         Price: item.Price,
          //         status: item.Available,
          //       });
          //     }
          //   } catch (error) {
          //     console.log("Error while update", error.message);
          //   }
          // });
          console.log("Checked Domains", (domainLength += forUpdate.length));
          await new Promise((resolve) => setTimeout(resolve, 3000));
          fs.unlinkSync(path.join(downloadPath, "results.csv"));
        } else if (data?.length == 0 && !error) {
          run = "false";
        }
      } catch (e) {
        console.log("Error while loop", e.message);
      }
    }
    process.exit(1);
  } catch (error) {
    console.log(error, "error <><><>");
  }
})();
