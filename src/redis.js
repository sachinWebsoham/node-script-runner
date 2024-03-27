const redis = require("../config/redis");
// const { websohambase } = require("../config/config");
(async () => {
  const result = await redis.smembers("externalLink");
  result.map((item) => {
    console.log(JSON.parse(item));
  });
  // console.log(result);
})();
