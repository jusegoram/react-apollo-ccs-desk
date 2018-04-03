import APIModel from 'server/api/util/APIModel'
import { QueryBuilder, Model, transaction } from 'objection'
import Promise from 'bluebird'
import _ from 'lodash'

export default class WorkGroup extends APIModel {
  static knexCreateTable = `
    table.uuid('id').primary().defaultTo(knex.raw("uuid_generate_v4()"))
    table.timestamp('deletedAt').index()
    // <custom>
    table.uuid('companyId')
    table.string('type').notNullable() // 'Company', 'Office', 'Team', 'DMA', 'Service Region', 'Division'
    table.string('externalId').notNullable()
    table.string('name').notNullable()
    table.unique(['companyId', 'type', 'externalId'])
    table.uuid('geographyId')
    // </custom>
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable()
  `
  static knexAlterTable = `
    table.foreign('geographyId').references('Geography.id')
    table.foreign('companyId').references('Company.id')
  `
  static knexCreateJoinTables = {
    workGroupTechs: `
      table.uuid('workGroupId').notNullable()
      table.uuid('techId').notNullable()
      table.primary(['workGroupId', 'techId'])
      table.unique(['techId', 'workGroupId'])
      table.foreign('workGroupId').references('WorkGroup.id')
      table.foreign('techId').references('Employee.id')
    `,
    workGroupManagers: `
      table.uuid('workGroupId').notNullable()
      table.uuid('managerId').notNullable()
      table.primary(['workGroupId', 'managerId'])
      table.unique(['managerId', 'workGroupId'])
      table.foreign('workGroupId').references('WorkGroup.id')
      table.foreign('managerId').references('Employee.id')
    `,
    directv_sr_data: `
      table.string('Service Region').index()
      table.string('Office')
      table.string('DMA')
      table.string('Division')
      table.string('HSP')
    `,
  }
  static jsonSchema = {
    title: 'WorkGroup',
    description: 'A person or group of people that fulfills work orders',
    type: 'object',

    properties: {
      id: { type: 'string' },
      // <custom>
      type: { type: 'string' },
      externalId: { type: ['string', 'null'] },
      name: { type: 'string' },
      // </custom>
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      deletedAt: { type: ['string', 'null'], format: 'date-time' },
    },
  }

  static visible = ['id', 'company', 'type', 'name', 'phoneNumber', 'email', 'employees', 'managers']

  static get QueryBuilder() {
    return class extends QueryBuilder {
      _contextFilter() {
        const { session } = this.context()
        if (session === undefined) return
        if (session === null) return this.whereRaw('FALSE')
      }
    }
  }

  static get relationMappings() {
    return {
      managers: {
        relation: Model.ManyToManyRelation,
        modelClass: 'Employee',
        join: {
          from: 'WorkGroup.id',
          through: {
            from: 'workForceManagers.workForceId',
            to: 'workForceManagers.managerId',
          },
          to: 'Employee.id',
        },
      },
      techs: {
        relation: Model.ManyToManyRelation,
        modelClass: 'Employee',
        join: {
          from: 'WorkGroup.id',
          through: {
            from: 'workForceTechs.workForceId',
            to: 'workForceTechs.techId',
          },
          to: 'Employee.id',
        },
      },
    }
  }
}
