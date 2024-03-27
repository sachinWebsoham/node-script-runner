const { Redis } = require("ioredis");
const redis = new Redis({
  port: 6379, // Redis server port
  host: "srv-captain--wsredis.captain.cap.websohamsp.site", // Redis server hostname
  password: "sachin@2002", // Redis server password
  // add any other configuration options here if needed
});

module.exports = redis;
