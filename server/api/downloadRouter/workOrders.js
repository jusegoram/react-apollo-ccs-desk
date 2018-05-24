import { Model, raw } from 'objection'
import knex from 'server/knex'
import * as models from 'server/api/models'
import _ from 'lodash'
import stringify from 'csv-stringify'
import express from 'express'
import Tech from 'server/api/models/Tech'

Model.knex(knex)

const router = express.Router()

router.get('/', async (req, res) => {
  const { session, moment } = req
  if (!session) return res.sendStatus(401)

  res.writeHead(200, {
    'Content-Type': 'text/csv',
    'Access-Control-Allow-Origin': '*',
    'Content-Disposition': 'attachment; filename=WorkOrders.csv',
  })
  const stringifier = stringify({ header: true })
  const { Appointment } = models
  const knex = Appointment.knex()
  const endOfQueryDate = moment(req.query.date, 'YYYY-MM-DD')
  .endOf('day')
  .format()
  const startOfDataImportsOnQueryDate = moment
  .tz(req.query.date, 'YYYY-MM-DD', 'America/Chicago')
  .startOf('day')
  .add(5, 'hours')
  .format()
  const visibleWorkGroupIds = knex('WorkGroup')
  .select('id')
  .where('companyId', session.account.company.id)
  const visibleAppointmentIds = knex('workGroupAppointments')
  .select('appointmentId')
  .whereIn('workGroupId', visibleWorkGroupIds)
  const scope = knex('Appointment')
  .distinct('workOrderId')
  .whereIn('id', visibleAppointmentIds)
  .whereRaw("lifespan && tstzrange(?, ?, '[)')", [startOfDataImportsOnQueryDate, endOfQueryDate])
  .where('dueDate', req.query.date)

  await knex('Appointment')
  .with('most_recent', qb => {
    qb
    .select('workOrderId', knex.raw('MAX("createdAt") as "createdAt"'))
    .from('Appointment')
    .whereIn('workOrderId', scope)
    .where('createdAt', '<=', endOfQueryDate)
    .groupBy('workOrderId')
  })
  .innerJoin('most_recent', function() {
    this.on('Appointment.workOrderId', '=', 'most_recent.workOrderId').on(
      'Appointment.createdAt',
      '=',
      'most_recent.createdAt'
    )
  })
  .select('row', 'type', 'status', 'dueDate')
  .then(_.identity)
  .filter(appointment => {
    const { row, status } = appointment
    if (status !== 'Cancelled') return true
    const dueDate = appointment.dueDate && moment(appointment.dueDate).startOf('day')
    if (!dueDate || !dueDate.isValid()) return true
    const cancelledDate = moment(row['Cancelled Date'], 'YYYY-MM-DD HH:mm:ss').startOf('day')
    if (!cancelledDate.isValid()) return true
    const cancelledInThePast = cancelledDate.isBefore(dueDate)
    console.log('is past', cancelledInThePast)
    return !cancelledInThePast
  })
  .map(appointment => ({
    ...appointment,
    row: _.mapValues(appointment.row, val => (val === true ? 'TRUE' : val === false ? 'FALSE' : val)),
  }))
  .map(appointment => {
    let { status } = appointment
    const dueDate = appointment.dueDate && moment(appointment.dueDate)
    const dueInTheFuture = dueDate.isAfter(endOfQueryDate)
    if (dueInTheFuture) status = 'Rescheduled'
    return {
      ...appointment.row,
      Status: status,
    }
  })
  .then(rows => _.sortBy(rows, ['DMA', 'Tech ID']))
  .map(row => {
    stringifier.write(row)
  })
  stringifier.end()
  stringifier.pipe(res)
})

export default router
