import _ from 'lodash'
import { transaction, raw } from 'objection'
import * as rawModels from 'server/api/models'
import { streamToArray } from 'server/util'
import Timer from 'server/util/Timer'
import Promise from 'bluebird'
import moment from 'moment-timezone'
import WorkGroup from 'server/api/models/WorkGroup'
import Company from 'server/api/models/Company'
import sanitizeCompanyName from 'server/cli/commands/import/processors/sanitizeCompanyName'

class ExpectedError extends Error {}

export default async ({ csvObjStream, w2Company }) => {
  const timer = new Timer()
  timer.start('Total')
  timer.start('Initialization')
  await transaction(..._.values(rawModels), async (...modelsArray) => {
    const models = _.keyBy(modelsArray, 'name')
    const { Tech, WorkOrder, SdcrDataPoint, Appointment } = models
    const knex = Appointment.knex()

    const srData = _.keyBy(
      await knex('directv_sr_data').select('Service Region', 'Office', 'DMA', 'Division'),
      'Service Region'
    )

    const rows = await streamToArray(csvObjStream)
    let invalidRowsDetected = []
    console.log(`${rows.length} rows to process`)
    let index = 0
    await Promise.map(
      rows,
      async row => {
        index++
        if (!(index % 1000)) console.log(index / 1000)
        try {
          const externalId = row['Activity ID']
          if (row['Subcontractor Company Name'] === 'UNKNOWN') delete row['Subcontractor Company Name']
          const subcontractorName = sanitizeCompanyName(row['Subcontractor Company Name'])
          const subcontractor = await Company.query().findOne({ name: subcontractorName })

          const tech = await (async () => {
            if (
              row['Activity Status (Snapshot)'] === 'Closed' ||
              row['Activity Status (Snapshot)'] === 'Pending Closed'
            ) {
              const tech = await Tech.query().findOne({ externalId: row['Tech ID'] })
              if (!tech) throw new ExpectedError(`Unable to find tech with tech ID ${row['Tech ID']}`)
              return tech
            }
            const endOfBgoSnapshotDate = moment(row['BGO Snapshot Date'], 'YYYY-MM-DD')
            .endOf('day')
            .format()
            const appointment = await Appointment.query()
            .eager('assignedTech')
            .findOne(raw('lifespan @> ? and "externalId" = ?', [endOfBgoSnapshotDate, externalId]))
            if (!appointment)
              throw new ExpectedError(
                `Unable to find appointment with ID ${externalId} that existed at ${endOfBgoSnapshotDate}`
              )
            const tech = appointment.assignedTech
            if (!tech)
              throw new ExpectedError(
                `The appointment with ID ${externalId} that existed at ${endOfBgoSnapshotDate} did not have an assigned tech`
              )
            return tech
          })()

          const sdcrWorkGroups = await (async () => {
            const srWorkGroupTypes = ['Service Region', 'DMA', 'Office', 'Division']
            const companyIds = _.filter([w2Company.id, subcontractor && subcontractor.id])
            const getSrWorkGroups = async company => {
              const workGroupExternalIds = srData[row['Service Region']]
              return await WorkGroup.query()
              .whereIn('companyId', companyIds)
              .where(qb => {
                srWorkGroupTypes.forEach(type => {
                  qb.orWhere({ type, externalId: workGroupExternalIds[type] })
                })
              })
            }
            return _.flatten(
              _.filter(
                await Promise.all([
                  tech.$relatedQuery('workGroups').whereNotIn('type', srWorkGroupTypes),
                  getSrWorkGroups(w2Company),
                  subcontractor && getSrWorkGroups(subcontractor),
                ])
              )
            )
          })()

          await SdcrDataPoint.query()
          .where({
            externalId: row['Activity ID'],
            date: row['BGO Snapshot Date'],
          })
          .delete()

          const badProps = [
            'HSP Partner Name',
            'DMA',
            'Office',
            'Service Region',
            'Tech Team',
            'Tech ID',
            'Tech Name',
            'Subcontractor',
            'Company Name',
          ]
          badProps.forEach(prop => {
            delete row[prop]
          })
          row['Tech ID'] = tech.externalId
          const teamGroup = _.find(sdcrWorkGroups, { type: 'Team' })
          row['Team Name'] = teamGroup && teamGroup.name
          sdcrWorkGroups.forEach(workGroup => {
            row[workGroup.type] = workGroup.externalId
          })

          const sdcrDataPoint = await SdcrDataPoint.query().insert({
            value: row['# of Same Day Activity Closed Count'] === '1' ? 1 : 0,
            date: row['BGO Snapshot Date'],
            techId: tech.id,
            externalId: row['Activity ID'],
            type: row['Activity Sub Type (Snapshot)'],
            dwellingType: row['Dwelling Type'],
            row: row,
          })
          await sdcrDataPoint.$relatedQuery('workGroups').relate(sdcrWorkGroups)
        } catch (e) {
          if (!(e instanceof ExpectedError)) throw e
          invalidRowsDetected.push({
            failureReason: e.message,
            ...row,
          })
        }
      },
      { concurrency: 200 }
    )

    if (invalidRowsDetected.length) {
      console.log('invalid row detected')
      console.log(invalidRowsDetected)
      // TODO: Email Tim - attach Sclosed csv
    }
  })
  timer.stop('Total')
  console.log(timer.toString()) // eslint-disable-line no-console
}
