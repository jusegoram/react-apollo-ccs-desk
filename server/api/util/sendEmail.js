import nodemailer from 'nodemailer'
import sesTransport from 'nodemailer-ses-transport'
import AWS from 'aws-sdk'
import Promise from 'bluebird'

AWS.config.accessKeyId = process.env.AWS_ACCESS_KEY_ID
AWS.config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
AWS.config.region = 'us-east-1'
AWS.config.sslEnabled = true

const SES = new AWS.SES({ apiVersion: '2010-12-01' })
const NodeMailer = nodemailer.createTransport(sesTransport({ ses: SES, rateLimit: 14 }))
Promise.promisifyAll(NodeMailer)

export default ({ recipient, subject, text, html }) => {
  return NodeMailer.sendMailAsync({
    from: 'CCS Desk<info@ccsdesk.com>',
    to: recipient,
    subject,
    text,
    html,
  })
}
