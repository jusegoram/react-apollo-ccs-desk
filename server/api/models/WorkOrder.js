import APIModel from 'server/api/util/APIModel'
import { QueryBuilder, Model, raw } from 'objection'

export default class WorkOrder extends APIModel {
  static knexCreateTable = `
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    // <custom>
    table.uuid('dataSourceId').index()
    table.string('externalId').index()
    table.date('date')
    table.string('type')
    table.string('status')
    // </custom>
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
  `
  static knexAlterTable = `
    table.foreign('dataSourceId').references('DataSource.id')
  `
  static jsonSchema = {
    title: 'WorkOrder',
    description: 'A request from a customer for work',
    type: 'object',

    properties: {
      id: { type: 'string' },
      // <custom>
      externalId: { type: ['string', 'null'] },
      date: { type: 'string', format: 'date-time' },
      status: { type: ['string', 'null'] },
      // </custom>
    },
  }

  static visible = ['id', 'externalId', 'type', 'status', 'date']

  static get QueryBuilder() {
    return class extends QueryBuilder {
      _contextFilter() {
        const { session } = this.context()
        if (session === undefined) return
        if (session === null) return this.whereRaw('FALSE')
      }
      near({ lat, lng, radius }) {
        this.whereRaw('ST_Distance(ST_Point(?, ?)::geography, location::geography) < ?', [lng, lat, radius]).orderBy(
          raw('ST_Distance(ST_Point(?, ?)::geography, location::geography)', [lng, lat])
        )
      }
    }
  }

  static get relationMappings() {
    return {
      dataSource: {
        relation: Model.HasOneRelation,
        modelClass: 'DataSource',
        join: {
          from: 'WorkOrder.dataSourceId',
          to: 'DataSource.id',
        },
      },
    }
  }
}
