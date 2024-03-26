const redis = require("redis");

// Create a Redis client
const client = redis.createClient(6379, "srv-captain--wsredis", {
  password: "sachin@2002",
});

// SET operation
(async () => {
  const result = await client.set("mykey", "myvalue");
  console.log(result, ">>>");
  const ss = await client.get("myKey");
  console.log(ss, "<<<");
})();
