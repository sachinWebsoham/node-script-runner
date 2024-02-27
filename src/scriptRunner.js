const axios = require("axios");
const { supabase } = require("../config/config");
const filteration = async (urls) => {
  try {
    let data = JSON.stringify({
      domainNames: urls,
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.name.com/v4/domains:checkAvailability",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic c2FjaGluc29uaTIwMDI6MzVmNGM0YjlkYTZlNmRmMTRjNTZlYzI5NDgyZTQ0NGRlMDMwM2ZkOQ==",
        Cookie:
          "__cf_bm=YGDtUAEBNLZC.aQ2nXhIuMRFUhidsqQM4Tz6ma1ex3Q-1708931900-1.0-AT6nSRasiX+NV11on/k3rWgSxOzLW6yDqkAfUGCEddsaVw04+TS7Db8RjmggznHbxcjX6QN1b8eTdFiaz4OmX9I=; REG_IDT=03b3f81552d8afd0ca2ebe3794c3224f; TS01b5f4e3=0181d9135da5df0a7949b7c88459ef4048178f7cc9e5339471f1967c59128ac4b10204bd631e08ab29b78517bd4fbbe97b05072fb0",
      },
      data: data,
    };

    const response = await axios.request(config);

    return response.data["results"];
  } catch (error) {
    console.log(error);
    throw error; // You may want to handle the error accordingly
  }
};
let counter = 1;
const externalLinkCheckerTimer = 1000 * 6;
const externalLinkChecker = async () => {
  console.log("start :-", counter++);
  try {
    const { data } = await supabase
      .from("crawling_external_link")
      .select()
      .neq("status_code", 200)
      .eq("status", false)
      .limit(20);
    console.log("External Link :-", data.length);
    if (data?.length > 0) {
      const updatedData = data.map((row) => ({ ...row, status: true }));
      const urls = data.map((row) => {
        return new URL(row.url).hostname;
      });
      const result = await filteration(urls);
      if (result?.length > 0) {
        console.log("Filteration Status:-", result.length);
        const resultUrl = result.map((item) => item.domainName);
        urls.map(async (element) => {
          if (!resultUrl.includes(element)) {
            await supabase
              .from("crawling_broken_link")
              .insert({ url: element });
          }
        });
        result.forEach(async (element) => {
          if (element) {
            if (element.purchasable) {
              await supabase.from("crawling_broken_link").insert({
                url: element.domainName,
                checked: true,
                result: element,
                availability: true,
              });
            } else {
              await supabase.from("crawling_broken_link").insert({
                url: element.domainName,
                checked: true,
                result: element,
                availability: false,
              });
            }
          }
        });
      }
      const { error: updateError } = await supabase
        .from("crawling_external_link")
        .upsert(updatedData);

      if (updateError) {
        console.error("Error updating data:", updateError.message);
      }
    }
  } catch (error) {
    console.log("broken_url", error.message);
  }
  return;
};
const brokenLinkChecker = async () => {
  console.log("start :-", counter++);
  try {
    const { data } = await supabase
      .from("crawling_broken_link")
      .select()
      .eq("checked", false)
      .limit(50);
    console.log("Broken Link :-", data.length);
    console.log("Broken Link :-", data);
    if (data?.length > 0) {
      const urls = data.map((item) => item.url);
      console.log(urls, ">");
      const result = await filteration(urls);
      console.log(result, "......");
      if (result?.length > 0) {
        result.forEach(async (element) => {
          if (element) {
            if (element.purchasable) {
              const { error: updateError } = await supabase
                .from("crawling_broken_link")
                .upsert(
                  {
                    url: element.domainName,
                    checked: true,
                    result: element,
                    availability: true,
                  },
                  {
                    onConflict: ["url"],
                    updateColumns: ["checked", "availability", "result"],
                  }
                );
              if (updateError) {
                console.error(
                  "Error availability updating data:",
                  updateError.message
                );
              }
            } else {
              const { error: updateError } = await supabase
                .from("crawling_broken_link")
                .upsert(
                  {
                    url: element.domainName,
                    checked: true,
                    result: element,
                    availability: false,
                  },
                  {
                    onConflict: ["url"],
                    updateColumns: ["checked", "availability", "result"],
                  }
                );
              if (updateError) {
                console.error(
                  "Error Unavailability updating data:",
                  updateError.message
                );
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.log("Error-broken-link:", error.message);
  }
  return;
};
// brokenLinkChecker();
// externalLinkChecker();
// setInterval(externalLinkChecker, externalLinkCheckerTimer);
setInterval(brokenLinkChecker, externalLinkCheckerTimer);
