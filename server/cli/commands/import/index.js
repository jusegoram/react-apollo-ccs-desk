import fs from 'fs'
import path from 'path'
import csv from 'csv'
import moment from 'moment-timezone'
import { DataImport, Company } from 'server/api/models'
import techProfileProcessor from 'server/cli/commands/import/processors/techProfile'
import siebelRoutelogProcessor from 'server/cli/commands/import/processors/routelog/siebel'
import edgeRoutelogProcessor from 'server/cli/commands/import/processors/routelog/edge'

const SiebelReportFetcher = require('./download/siebel/SiebelReportFetcher')
const convertStringToStream = require('./download/siebel/convertStringToStream')
const SanitizeStringStream = require('./download/siebel/SanitizeStringStream')

const analyticsCredentials = {
  Goodman: {
    username: 'MBMA090000',
    password: process.env.ANALYTICS_GOODMAN_PASSWORD,
  },
  DirectSat: {
    username: 'DSPA009875',
    password: process.env.ANALYTICS_DIRECTSAT_PASSWORD,
  },
}

const analyticsReportNames = {
  Siebel: {
    'Tech Profile': 'Tech Profile',
    Routelog: 'routelog',
  },
  Edge: {
    'MW Routelog': 'EDGEMW Bll',
    'SE Routelog': 'EDGESE Bll',
    'SW Routelog': 'EDGESW Bll',
    'W Routelog': 'EDGEW Bll',
  },
}

const processors = {
  Siebel: {
    'Tech Profile': techProfileProcessor,
    Routelog: siebelRoutelogProcessor,
  },
  Edge: {
    'MW Routelog': edgeRoutelogProcessor,
  },
}
const mockFiles = {
  Goodman: {
    Siebel: {
      // 'Tech Profile': 'full/Goodman/techProfile.csv',
      'Tech Profile': 'techProfile.csv',
      Routelog: 'full/Goodman/routelog.csv',
    },
    Edge: {
      'MW Routelog': 'full/Goodman/edge.mw.csv',
      'SE Routelog': 'full/Goodman/edge.se.csv',
      'SW Routelog': 'full/Goodman/edge.sw.csv',
    },
  },
  DirectSat: {
    Siebel: {
      'Tech Profile': 'full/DirectSat/techProfile.csv',
      Routelog: 'full/DirectSat/routelog.csv',
    },
    Edge: {
      'MW Routelog': 'full/DirectSat/edge.mw.csv',
      'SE Routelog': 'full/DirectSat/edge.se.csv',
      'SW Routelog': 'full/DirectSat/edge.sw.csv',
    },
  },
}

const screenshotsDirectory = path.resolve(__dirname, 'screenshots')
module.exports = async ({ companyName, dataSourceName, reportName }) => {
  const w2Company = await Company.query().findOne({ name: companyName })
  const dataSource = await w2Company
  .$relatedQuery('dataSources')
  .where({ name: dataSourceName })
  .first()
  if (!dataSource) throw new Error('Unable to find that data source')
  const dataImport = await DataImport.query()
  .insert({ dataSourceId: dataSource.id, reportName })
  .returning('*')
  try {
    // const credentials = analyticsCredentials[companyName]
    await dataImport.$query().patch({ status: 'Downloading' })
    // const analyticsReportName = analyticsReportNames[dataSourceName][reportName]
    // const csvString = await new SiebelReportFetcher(credentials).fetchReport(analyticsReportName, {
    //   loggingPrefix: 'CCS CLI',
    //   // screenshotsDirectory,
    //   // screenshotsPrefix: `${dataSource.service}_${dataSource.report}`,
    //   horsemanConfig: {
    //     cookiesFile: path.join(__dirname, `${companyName}_cookies.txt`),
    //   },
    // })
    const mockFile = mockFiles[companyName][dataSourceName][reportName]
    const csvString = fs.readFileSync(path.resolve(__dirname, 'mock_csvs', mockFile)) + ''
    const csvObjStream = convertStringToStream(csvString)
    .pipe(new SanitizeStringStream())
    .pipe(
      csv.parse({
        columns: true,
        trim: true,
        skip_empty_lines: true,
      })
    )
    await dataImport.$query().patch({ status: 'Processing', downloadedAt: moment().format() })
    await processors[dataSourceName][reportName]({ csvObjStream, dataSource, w2Company })
    await dataImport.$query().patch({ status: 'Complete', completedAt: moment().format() })
  } catch (e) {
    await dataImport.$query().patch({ status: 'Errored' })
    throw e
  }
}
