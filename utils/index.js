const TLDs = require("./tldList");
const ccLTD = require("./cctldList");
const { user_agent } = require("./user-agent");

const getRandomUserAgent = () => {
  const randomIndex = Math.floor(Math.random() * user_agent.length);
  return user_agent[randomIndex];
};
const validDomain = (domain) => {
  let validDomain;
  try {
    const domainPart = domain.split(".").filter((part) => part !== "");
    const partLength = domainPart.length;
    switch (true) {
      case partLength == 2 &&
        (TLDs.includes(domainPart[partLength - 1]) ||
          ccLTD.includes(domainPart[partLength - 1])):
        validDomain = `https://${domainPart.join(".")}`;
        break;
      case partLength == 3 &&
        ccLTD.includes(domainPart[partLength - 1]) &&
        TLDs.includes(domainPart[partLength - 2]):
        validDomain = `https://${domainPart.join(".")}`;
        break;
      case partLength == 3 && TLDs.includes(domainPart[partLength - 1]):
        validDomain = `https://${domainPart.slice(1).join(".")}`;
        break;
      case partLength == 3 && ccLTD.includes(domainPart[partLength - 1]):
        validDomain = `https://${domainPart.slice(1).join(".")}`;
        break;
      case partLength > 3 &&
        ccLTD.includes(domainPart[partLength - 1]) &&
        TLDs.includes(domainPart[partLength - 2]):
        const startIndex = Math.max(0, partLength - 3);
        validDomain = `https://${domainPart.slice(startIndex).join(".")}`;
        break;
      case partLength > 3 && ccLTD.includes(domainPart[partLength - 1]):
        const startIndex1 = Math.max(0, partLength - 2);
        validDomain = `https://${domainPart.slice(startIndex1).join(".")}`;
        break;
      case partLength > 3 && TLDs.includes(domainPart[partLength - 1]):
        const startIndex2 = Math.max(0, partLength - 2);
        validDomain = `https://${domainPart.slice(startIndex2).join(".")}`;
        break;
      default:
        validDomain = "Invalid domain";
    }
    return validDomain;
  } catch (error) {
    // console.log("Error-validDomain:", error.message);
  }
};

const getUrl = (link, host, defaultProtocol = "https://") => {
  try {
    if (link.includes("http")) {
      return link;
    } else if (link.startsWith("//")) {
      return `${defaultProtocol}${link}`;
    } else if (link.startsWith("/")) {
      return `${defaultProtocol}${host}/${link}`;
    }
  } catch (error) {
    // console.log(error.message);
  }
};

const ignoreExtention = [
  "webp",
  "mp3",
  "wav",
  "m4a",
  "flac",
  "aac",
  "mp4",
  "avi",
  "mkv",
  "mov",
  "wmv",
  "jpeg",
  "jpg",
  "png",
  "gif",
  "tiff",
  "raw",
];

const checkLinkStatus = async (url) => {
  try {
    const response = await axios.head(url);
    return response.status;
  } catch (error) {
    return error.response ? error.response.data : 0;
  }
};
class BloomFilter {
  constructor(size, numHashes) {
    this.size = size;
    this.numHashes = numHashes;
    this.bitArray = new Array(size).fill(false);
  }

  // Hash function 1
  hash1(item) {
    let hash = 0;
    for (let i = 0; i < item.length; i++) {
      hash = (hash << 5) + hash + item.charCodeAt(i);
    }
    return Math.abs(hash) % this.size;
  }

  // Hash function 2
  hash2(item) {
    let hash = 0;
    for (let i = 0; i < item.length; i++) {
      hash = (hash << 4) + hash + item.charCodeAt(i);
    }
    return Math.abs(hash) % this.size;
  }

  // Add an item to the Bloom filter
  add(item) {
    for (let i = 0; i < this.numHashes; i++) {
      const index = (this.hash1(item) + i * this.hash2(item)) % this.size;
      this.bitArray[index] = true;
    }
  }

  // Check if an item may be in the Bloom filter
  contains(item) {
    for (let i = 0; i < this.numHashes; i++) {
      const index = (this.hash1(item) + i * this.hash2(item)) % this.size;
      if (!this.bitArray[index]) {
        return false;
      }
    }
    return true;
  }
}

// Example usage:
const filter = new BloomFilter(10000000, 5);

module.exports = {
  validDomain,
  getUrl,
  ignoreExtention,
  getRandomUserAgent,
  checkLinkStatus,
  filter,
};
