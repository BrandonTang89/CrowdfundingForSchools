// Connect to PostgreSQL
// Create a new pool instance
const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'crowdfundingsitedb',
    password: process.env.POSTGRES_PASSWORD,
    port: 5432, // default port for PostgreSQL
  });
  
  // Test the database connection
  pool.connect((err, client, done) => {
    if (err) {
      console.error('Error connecting to the database:', err);
    } else {
      console.log('Connected to the database');
      // Perform database operations here
    }
    done();
  });
  
  // Export the pool for use in other modules
  module.exports = pool;