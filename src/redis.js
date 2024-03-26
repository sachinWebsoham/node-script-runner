const redis = require("../config/redis");
const { websohambase } = require("../config/config");
(async () => {
  await redis.del("externalLink");
  const { data, error } = await websohambase
    .from("sitemap_external_link")
    .select()
    .limit(50);
  data.map(async (item) => {
    await redis.sadd("externalLink", JSON.stringify(item));
  });
  const result = await redis.smembers("externalLink");
  result.map((item) => {
    console.log(JSON.parse(item));
  });
  // console.log(result);
})();
