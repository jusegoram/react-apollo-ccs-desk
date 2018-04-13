import _ from 'lodash'
import Promise from 'bluebird'

import { transaction } from 'objection'
import { WorkGroup, Company, Employee } from 'server/api/models'
import moment from 'moment-timezone'
import { streamToArray } from 'server/util'

const serviceW2Company = {
  'Goodman Analytics': 'Goodman',
  'DirectSat Analytics': 'DirectSat',
}

/* Sample Row Data:
  // { Region: 'AREA01',
  //   DMA: 'HOUSTON TX 1',
  //   Office: 'HOUSTON CENTRAL',
  //   'Service Region': 'TX05',
  //   'Tech Team Supervisor Login': 'MBTX033910',
  //   'Team ID': 'MB000661',
  //   'Team Name': 'JUSTIN JOHNSON',
  //   'Team Email': 'JJOHNSON@goodmannetworks.com',
  //   'Tech User ID': 'MBTX053759',
  //   'Tech ATT UID': 'MC170S',
  //   'Tech Full Name': 'CANDIA, MIGUEL',
  //   'Tech Type': 'Goodman',
  //   'Tech Team Supervisor Mobile #': '8325974061',
  //   'Tech Mobile Phone #': '8325645155',
  //   'Tech Schedule': 'WG 8-6 S Th off',
  //   'Tech Efficiency': '1.2',
  //   'Skill Package': 'INSTALL UPGRADE SERVICE - COMM MDU WB NC ROLLBACK FW',
  //   'Max Travel Miles': '15',
  //   'Start State': 'TX',
  //   'Start City': 'CLEVELAND',
  //   'Start Street': '188 COUNTY RD 2800',
  //   'Start Zip': '77327',
  //   'Start Latitude': '30315160',
  //   'Start Longitude': '-94937570',
  //   'End of Day State': '',
  //   'End of Day City': '',
  //   'End of Day Street': '',
  //   'End of Day Zip': '',
  //   'End of Day Latitude': '0',
  //   'End of Day Longitude': '0' }
*/

export default async ({ csvObjStream, dataSource }) => {
  const models = [WorkGroup, Company, Employee]
  await transaction(...models, async (WorkGroup, Company, Employee) => {
    let srData = null

    const allEmployeeExternalIds = []

    const w2CompanyName = serviceW2Company[dataSource.service]
    srData = _.keyBy(
      await WorkGroup.knex()
      .select('Service Region', 'Office', 'DMA', 'Division')
      .from('directv_sr_data')
      .where({ HSP: w2CompanyName }),
      'Service Region'
    )

    const w2Company = await Company.query().ensure(w2CompanyName)

    const techDatas = await streamToArray(csvObjStream, data => {
      if (data['Tech Type'] === 'W2' || !data['Tech Type']) data['Tech Type'] = w2CompanyName
      data.Company = data['Tech Type']
      if (data.Company !== w2CompanyName || !data['Team ID'] || data['Team ID'] === 'UNKNOWN') delete data['Team ID']
      data.Team = data['Team ID']
      data.Tech = data['Tech User ID']
      return data
    })

    const techDatasByCompany = _.groupBy(techDatas, 'Tech Type')
    await Promise.mapSeries(Object.keys(techDatasByCompany), async companyName => {
      const company = await Company.query().ensure(companyName)

      const companyId = company.id

      const companyTechDatas = techDatasByCompany[companyName]
      await Promise.map(
        companyTechDatas,
        async techData => {
          const employee = await Employee.query().upsertTech({ companyId, techData, dataSource })

          await employee.$loadRelated('workGroups')

          const techSR = techData['Service Region']

          const relatedWorkGroupsById = _.keyBy(employee.workGroups, 'id')
          const ensureRelated = async workGroup => {
            if (workGroup && !relatedWorkGroupsById[workGroup.id]) {
              await employee.$relatedQuery('workGroups').relate(workGroup)
              relatedWorkGroupsById[workGroup.id] = workGroup
            }
          }

          const techWorkGroup = await WorkGroup.query().ensure({
            w2Company,
            type: 'Tech',
            companyId: w2Company.id,
            externalId: employee.externalId,
            name: employee.name,
          })
          await employee.$query().patch({ workGroupId: techWorkGroup.id })
          await ensureRelated(techWorkGroup)

          const teamWorkGroup = await WorkGroup.query().ensure({
            w2Company,
            type: 'Team',
            companyId: w2Company.id,
            externalId: techData['Team ID'],
            name: techData['Team ID'],
          })
          const supervisor = await Employee.query().upsertSupervisor({ companyId, techData, dataSource })
          await supervisor.$loadRelated('managedWorkGroups')
          if (!_.find(supervisor.managedWorkGroups, { id: teamWorkGroup.id })) {
            await supervisor.$relatedQuery('managedWorkGroups').relate(teamWorkGroup)
          }
          await ensureRelated(teamWorkGroup)

          await ensureRelated(
            await WorkGroup.query().ensure({
              w2Company,
              type: 'Company',
              companyId: w2Company.id,
              externalId: w2Company.name,
              name: w2Company.name,
            })
          )
          await ensureRelated(
            await WorkGroup.query().ensure({
              w2Company,
              type: 'Company',
              companyId,
              externalId: company.name,
              name: company.name,
            })
          )
          const techSrData = srData[techSR]
          await ensureRelated(
            await WorkGroup.query().ensure({
              w2Company,
              type: 'Service Region',
              companyId: w2Company.id,
              externalId: techSR,
              name: techSR,
            })
          )
          if (techSrData) {
            await ensureRelated(
              await WorkGroup.query().ensure({
                w2Company,
                type: 'Office',
                companyId: w2Company.id,
                externalId: techSrData['Office'],
                name: techSrData['Office'],
              })
            )
            await ensureRelated(
              await WorkGroup.query().ensure({
                w2Company,
                type: 'DMA',
                companyId: w2Company.id,
                externalId: techSrData['DMA'],
                name: techSrData['DMA'],
              })
            )
            await ensureRelated(
              await WorkGroup.query().ensure({
                w2Company,
                type: 'Division',
                companyId: w2Company.id,
                externalId: techSrData['Division'],
                name: techSrData['Division'],
              })
            )
          }
        },
        { concurrency: 1 }
      )
      await Employee.query()
      .where({ dataSourceId: dataSource.id })
      .whereNotIn('externalId', allEmployeeExternalIds)
      .patch({ terminatedAt: moment.utc().format() })
    })
  })
}
