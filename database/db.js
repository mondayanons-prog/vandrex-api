import knex from "knex";

const config = {
  password:process.env.DB_PG_PASSWORD,
  host: process.env.DB_PG_HOST,
  port: process.env.DB_PG_PORT,
  database: process.env.DB_PG_DATABASE,
  user: process.env.DB_PG_USER,
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.DB_PG_SSL_CA,
  },
};

const db = knex({
  client: "pg",
  connection: config,
});

export default db;
