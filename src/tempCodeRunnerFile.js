const validDomain = (domain) => {
  let validDomain;
  try {
    const domainPart = domain.split(".").filter((part) => part !== "");
    const partLength = domainPart.length;
    switch (true) {
      case partLength == 2 &&
        (TLDs.includes(domainPart[partLength - 1]) ||
          ccLTD.includes(domainPart[partLength - 1])):
        validDomain = domainPart.join(".");
        break;
      case partLength == 3 &&
        ccLTD.includes(domainPart[partLength - 1]) &&
        TLDs.includes(domainPart[partLength - 2]):
        validDomain = domainPart.join(".");
        break;
      case partLength == 3 && TLDs.includes(domainPart[partLength - 1]):
        validDomain = domainPart.slice(1).join(".");
        break;
      case partLength == 3 && ccLTD.includes(domainPart[partLength - 1]):
        validDomain = domainPart.slice(1).join(".");
        break;
      case partLength > 3 &&
        ccLTD.includes(domainPart[partLength - 1]) &&
        TLDs.includes(domainPart[partLength - 2]):
        const startIndex = Math.max(0, partLength - 3);
        validDomain = domainPart.slice(startIndex).join(".");
        break;
      case partLength > 3 && ccLTD.includes(domainPart[partLength - 1]):
        const startIndex1 = Math.max(0, partLength - 2);
        validDomain = domainPart.slice(startIndex1).join(".");
        break;
      case partLength > 3 && TLDs.includes(domainPart[partLength - 1]):
        const startIndex2 = Math.max(0, partLength - 2);
        validDomain = domainPart.slice(startIndex2).join(".");
        break;
      default:
        validDomain = "Invalid domain";
    }
    return validDomain;
  } catch (error) {
    console.log("Error-validDomain:", error.message);
  }
};