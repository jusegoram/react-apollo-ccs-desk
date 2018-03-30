import { withDeletedAt } from 'server/api/util/mixins'
import APIModel from 'server/api/util/APIModel'
import { QueryBuilder, Model } from 'objection'
import { GraphQLString } from 'graphql'
import ExpectedError from 'server/errors/ExpectedError'

export default class Timecard extends withDeletedAt(APIModel) {
  static knexCreateTable = `
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('deletedAt').index()
    table.uuid('employeeId').notNullable()
    table.date('date')
    table.timestamp('clockedInAt')
    table.timestamp('clockedOutAt')
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  `
  static knexAlterTable = `
    table.foreign('employeeId').references('Employee.id')
  `
  static jsonSchema = {
    title: 'Timecard',
    description: "An employee's timecard",
    type: 'object',

    properties: {
      id: { type: 'string' },
      clockedInAt: { type: ['string', 'null'], format: 'date-time' },
      clockedOutAt: { type: ['string', 'null'], format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      deletedAt: { type: ['string', 'null'], format: 'date-time' },
    },
  }

  static visible = ['id', 'clockedInAt', 'clockedOutAt', 'employee']

  static get QueryBuilder() {
    return class extends QueryBuilder {
      _contextFilter() {
        // this.whereRaw('FALSE')
      }
    }
  }

  static get relationMappings() {
    return {
      employee: {
        relation: Model.BelongsToOneRelation,
        modelClass: 'Employee',
        join: {
          from: 'Timecard.employeeId',
          to: 'Employee.id',
        },
      },
      vehicle: {
        relation: Model.HasOneRelation,
        modelClass: 'Vehicle',
        join: {
          from: 'Timecard.vehicleId',
          to: 'Vehicle.id',
        },
      },
      clockedInReport: {
        relation: Model.HasOneRelation,
        modelClass: 'Report',
        join: {
          from: 'Timecard.clockedInReportId',
          to: 'Report.id',
        },
      },
      clockedOutReport: {
        relation: Model.HasOneRelation,
        modelClass: 'Report',
        join: {
          from: 'Timecard.clockedOutReportId',
          to: 'Report.id',
        },
      },
    }
  }

  static get mutations() {
    return {
      create: {
        description: 'create a timecard',
        type: this.GraphqlTypes.Timecard,
        args: {
          vehicleExternalId: { type: GraphQLString },
        },
        resolve: async (root, { vehicleExternalId }, { session }) => {
          if (!session) throw new ExpectedError('Unauthorized Access')
          const Vehicle = require('./Vehicle').default
          const vehicle = await Vehicle.query()
          .where({ externalId: vehicleExternalId })
          .first()

          if (!vehicle) throw new ExpectedError('Unable to find a vehicle with that identifier')
          const timecard = await Timecard.query()
          .insert({
            employeeId: session.account.employee.id,
            vehicleId: vehicle.id,
          })
          .returning('*')
          console.log(timecard)
          return timecard
        },
      },
    }
  }
}
