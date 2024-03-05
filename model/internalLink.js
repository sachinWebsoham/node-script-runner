const mongoose = require("mongoose");
const schema = mongoose.Schema(
  {
    page_url: String,
    status: Boolean,
    message: String,
  },
  { timestamps: true }
);
const InternalLink = mongoose.connect("internalLink", schema);
module.exports = { InternalLink };
