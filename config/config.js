const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = "https://brvtcgjuidugldgkzmux.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJydnRjZ2p1aWR1Z2xkZ2t6bXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg0MDQ3MjgsImV4cCI6MjAyMzk4MDcyOH0.Xx_uKJlIeg79blNWOM1b5JP4SI1RsoLAvufUsC4hWJw";
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
