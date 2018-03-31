
export function up(knex) {
  return knex.schema
  .createTable('Account', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('deletedAt').index()
    // <custom>
    table.string('name').notNullable()
    table.string('email').notNullable()
    table.string('password').notNullable()
    table.boolean('root').defaultTo(false).notNullable()
    table.uuid('employeeId')
    // </custom>
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('Company', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.string('name').unique()
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('Employee', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('terminatedAt')
    table.uuid('companyId').notNullable()
    table.string('externalId').notNullable()
    table.string('name')
    table.string('phoneNumber')
    table.string('email')
    table.uuid('dataSourceId')
    table.unique(['companyId', 'externalId'])
    table.unique(['externalId', 'companyId'])
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('Geography', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.string('type').notNullable()
    table.string('externalId')
    table.string('name')
    table.string('streetAddress')
    table.string('zipcode')
    table.string('city')
    table.string('state')
    table.string('country')
    table.text('polygonKml')
    table.specificType('polygon', 'geography(MULTIPOLYGON, 4326)').index()
    table.float('radius')
    table.decimal('latitude', 10, 7)
    table.decimal('longitude', 10, 7)
    table.specificType('point', 'geography(POINT, 4326)').index()
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
    table.index(['type', 'externalId'])
  })
  .createTable('Invite', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('deletedAt').index()
    // <custom>
    table.string('role').notNullable()
    table.string('status').notNullable().defaultTo('Unsent')
    table.uuid('token').defaultTo(knex.raw("uuid_generate_v4()"))
    table.uuid('senderId').notNullable()
    table.uuid('recipientId').notNullable()
    // </custom>
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('Question', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.integer('order').defaultTo(0).notNullable()
    table.text('question').notNullable()
    table.string('answerType').notNullable()
    table.text('answer')
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('Session', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('deletedAt').index()
    // <custom>
    table.timestamp('expiresAt').defaultTo(knex.fn.now())
    table.uuid('accountId')
    // </custom>
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('Timecard', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('deletedAt').index()
    table.uuid('employeeId')
    table.date('date').notNullable()
    table.timestamp('clockedInAt')
    table.timestamp('clockedOutAt')
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('Vehicle', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.uuid('companyId').notNullable()
    table.string('externalId').notNullable()
    table.unique(['companyId', 'externalId'])
    table.unique(['externalId', 'companyId'])
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('VehicleClaim', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('deletedAt').index()
    table.date('date').notNullable()
    table.uuid('employeeId')
    table.uuid('vehicleId')
    table.uuid('startReportId')
    table.uuid('endReportId')
    table.timestamp('claimedAt')
    table.timestamp('unclaimedAt')
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
  })
  .createTable('Report', table => {
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('deletedAt')
    table.uuid('companyId').notNullable()
    table.uuid('creatorId')
    table.string('name').notNullable()
    table.boolean('isTemplate').defaultTo(false).notNullable()
    table.timestamp('completedAt')
    table.index(['isTemplate', 'name'])
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
  .alterTable('Account', table => {
    table.foreign('employeeId').references('Employee.id')
  })
  .alterTable('Employee', table => {
    table.foreign('companyId').references('Company.id')
  })
  .alterTable('Invite', table => {
    table.foreign('senderId').references('Account.id')
    table.foreign('recipientId').references('Account.id')
  })
  .alterTable('Session', table => {
    table.foreign('accountId').references('Account.id')
  })
  .alterTable('Timecard', table => {
    table.foreign('employeeId').references('Employee.id')
  })
  .alterTable('Vehicle', table => {
    table.foreign('companyId').references('Company.id')
  })
  .alterTable('VehicleClaim', table => {
    table.foreign('employeeId').references('Employee.id')
    table.foreign('vehicleId').references('Vehicle.id')
    table.foreign('startReportId').references('Report.id')
    table.foreign('endReportId').references('Report.id')
  })
  .alterTable('Report', table => {
    table.foreign('creatorId').references('Account.id')
    table.foreign('companyId').references('Company.id')
  })
  .createTable('vehicleReports', table => { 
      table.uuid('vehicleId').notNullable()
      table.uuid('reportId').notNullable()
      table.primary(['vehicleId', 'reportId'])
      table.unique('reportId')
      table.foreign('vehicleId').references('Vehicle.id')
      table.foreign('reportId').references('Report.id')
  })
  .createTable('reportQuestions', table => { 
      table.uuid('reportId').notNullable()
      table.uuid('questionId').notNullable()
      table.primary(['reportId', 'questionId'])
      table.unique('questionId')
      table.foreign('reportId').references('Report.id')
      table.foreign('questionId').references('Question.id')
  })
}

export function down(knex) {
  return knex.raw(`
    DO $$ DECLARE
        r RECORD;
    BEGIN
        -- if the schema you operate on is not "current", you will want to
        -- replace current_schema() in query with 'schematodeletetablesfrom'
        -- *and* update the generate 'DROP...' accordingly.
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' and tablename not in ('knex_migrations', 'knex_migrations_lock')) LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
    END $$;
  `)
}
