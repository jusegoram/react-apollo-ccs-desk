// Update with your config settings.
module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'endeavor',
      multipleStatements: true,
      charset: 'utf8',
    },
    pool: {
      min: 4,
      max: 1024,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './server/db/migrations',
    },
    seeds: {
      directory: './server/db/seeds',
    },
  },
  production: {
    client: 'postgresql',
    connection: {
      host: 'endeavorfleet.coevycwg7sov.us-east-1.rds.amazonaws.com',
      user: 'master',
      password: process.env.PRODUCTION_PASSWORD,
      database: 'endeavor',
      multipleStatements: true,
      charset: 'utf8',
    },
    pool: {
      min: 4,
      max: 1024,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './server/db/migrations',
    },
    seeds: {
      directory: './server/db/seeds',
    },
  },
}
