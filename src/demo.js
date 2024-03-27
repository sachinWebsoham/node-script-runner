const { Client } = require("pg");

const client = new Client({
  user: "cap_pg_user",
  host: "srv-demo-supa-db.cap.websohamsp.site",
  database: "cap_pg_db",
  password: "1591acc92033c6e0f5406ae6b991df18",
  port: 5432,
});

async function connectAndCreateTable() {
  try {
    await client.connect(); // Connect to the database

    // SQL query to create a table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS example_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        age INT
      );
    `;

    // Execute the query
    await client.query(createTableQuery);
    console.log("Table 'example_table' created successfully.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    await client.end(); // Close the database connection
  }
}

connectAndCreateTable();
