const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = "https://tzolzkvowlfsahdnnlzb.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b2x6a3Zvd2xmc2FoZG5ubHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk2MTQ5OTYsImV4cCI6MjAyNTE5MDk5Nn0.tqFQNFCi12D-hB4CS7DSDCDCQ9kWvNmh1kOfA90LZ0I";
const supabase = createClient(supabaseUrl, supabaseKey);

const websohambaseUrl = "http://64.227.181.80:8000";
const websohambaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzEwNzg2NjAwLAogICJleHAiOiAxODY4NTUzMDAwCn0.7dFRAPts3fsl1BDBGrTvcz95RI-Iw-DVxk_imD2hW-8";
const websohambase = createClient(websohambaseUrl, websohambaseKey);
module.exports = { supabase, websohambase };
