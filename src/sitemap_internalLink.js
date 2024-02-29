const { supabase } = require("../config/config");
// Define the table and batch size
const tableName = "domain_page";
const batchSize = 1000;
// Function to fetch data with pagination
async function fetchDataWithPagination(offset) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("id", { ascending: true }) // Order by a suitable column
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error("Error fetching data:", error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.log(error.message);
  }
}

// Function to fetch all data with pagination
async function fetchAllData() {
  try {
    let offset = 0;
    let allData = [];

    while (true) {
      const batchData = await fetchDataWithPagination(offset);

      if (batchData.length === 0) {
        break;
      } else {
        batchData.map(async (object) => {
          //   extractExternalLink(object.page_url);
          await supabase
            .from("sitemap_internal_link")
            .insert({ page_url: object.page_url });
        });
      }

      allData = allData.concat(batchData);
      offset += batchSize;
    }

    return;
  } catch (error) {
    console.log(error.message);
  }
}

// Example usage
fetchAllData()
  .then((allData) => {
    console.log("All data:");
  })
  .catch((error) => {
    console.error("Error:", error.message);
  });
