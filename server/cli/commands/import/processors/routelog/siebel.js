import _ from 'lodash'
import { streamToArray } from 'server/util'
import sanitizeName from 'server/util/sanitizeName'
import Timer from 'server/util/Timer'
import handleStandardRows from 'server/cli/commands/import/processors/routelog/handleStandardRows'
import sanitizeCompanyName from 'server/cli/commands/import/processors/sanitizeCompanyName'

const convertRowToStandardForm = ({ row }) => ({
  Source: 'Siebel',
  'Partner Name': row.HSP || '',
  Subcontractor: row.Subcontractor || '',
  'Activity ID': row['Activity #'] || '',
  'Tech ID': row['Tech User ID'] || '',
  'Tech Name': sanitizeName(row['Tech Full Name']) || '',
  'Tech Team': row['Tech Team'] || '',
  'Tech Supervisor': sanitizeName(row['Team Name']) || '',
  'Service Region': row['SR'] || '',
  'Order Type': row['Order Type'] || '',
  Status: row['Status'] || '',
  'Reason Code': row['Reason Code'] || '',
  'Time Zone': row['Time Zone'] || '',
  'Created Date': row['Created Date (with timestamp)'] || '',
  'Due Date': row['Activity Due Date RT'] || '',
  'Planned Start Date': row['Planned Start Date RT'] || '',
  'Actual Start Date': row['Actual Start Date RT'] || '',
  'Actual End Date': row['Actual End Date RT'] || '',
  'Cancelled Date': row['Activity Cancelled Date'] || '',
  'Negative Reschedules': row['# of Negative Reschedules'] || '',
  'Planned Duration': row['Planned Duration (FS Scheduler)'] || '',
  'Actual Duration': row['Total Duration Minutes'] || '',
  'Service in 7 Days': '',
  'Repeat Service': '',
  'Internet Connectivity': row['Internet Connectivity'] === 'Y',
  'Customer ID': row['Cust Acct Number'] || '',
  'Customer Name': sanitizeName(row['Cust Name']) || '',
  'Customer Phone': sanitizeName(row['Home Phone']) || '',
  'Dwelling Type': row['Dwelling Type'] || '',
  Address: row['House #'] + ' ' + row['Street Name'],
  Zipcode: row['Zip'] || '',
  City: row['City'] || '',
  State: row['Service State'] || '',
  Latitude: row['Activity Geo Latitude'] / 1000000 || '',
  Longitude: row['Activity Geo Longitude'] / 1000000 || '',
})

/* Sample Row Data:
  { 'Time Zone': 'CENTRAL',
  'Activity Due Date': '4/19/18 16:00',
  'Activity Due Date RT': '4/19/18 12:00',
  'Planned Start Date RT': '4/19/18 8:00',
  'Actual Start Date RT': '',
  'Actual End Date RT': '',
  'Planned Duration (FS Scheduler)': '75',
  'Activity #': '1-2VSMN8EU',
  'Cust Acct Number': '53383365',
  SR: 'TX01',
  DMA: 'BEAUMONT TX',
  Office: computed,
  Division: computed,
  Status: 'Scheduled',
  'Reason Code': '',
  'Order Type': 'Service',
  'Tech User ID': 'MBTX031454',
  'Tech Full Name': 'GIBSON, GROVER',
  'Tech Team': 'MB000615',
  'Tech Type': 'W2',
  'Team Name': 'JONATHAN SHERILL',
  'Cust Name': 'MOYERS, JOHN MICHA',
  'House #': '9450',
  'Street Name': 'LANDIS DR',
  City: 'BEAUMONT',
  Zip: '77707',
  'Service County': 'Jefferson',
  'Service State': 'TX',
  'Home Phone': '4093500971',
  'Created Date (with timestamp)': '4/6/18 11:33',
  'Total Duration Minutes': '46',
  '# of Negative Reschedules': '1',
  'Activity Cancelled Date': '',
  'Activity Geo Longitude': '-94203680',
  'Activity Geo Latitude': '30066760',
  'Dwelling Type': 'Residential',
  'Internet Connectivity': 'Y',
  Timezone: '(GMT-06:00) Central Time (US & Canada)' }
*/

export default async ({ knex, csvObjStream, w2Company, now }) => {
  const timer = new Timer()
  timer.start('Total')

  timer.split('Stream to Array')
  const rows = await streamToArray(csvObjStream, data => {
    data.original_row = { ...data }
    data = _.mapKeys(data, (value, key) => key.replace(/[^a-zA-Z0-9~!@#$%^&*()\-+[\]{}|;',./<>?\s]/, ''))
    data.HSP = w2Company.name
    data.Subcontractor =
      data['Tech Type'] === 'W2' || !data['Tech Type'] ? null : sanitizeCompanyName(data['Tech Type'])
    if (!data['Tech User ID'] || data['Tech User ID'] === 'UNKNOWN') data['Tech User ID'] = null
    return convertRowToStandardForm({ row: data })
  })

  timer.split('Process Rows')
  await handleStandardRows({ knex, rows, now })

  timer.stop('Total')
  console.log(timer.toString()) // eslint-disable-line no-console
}
