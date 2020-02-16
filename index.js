// Scraping inspiration:
// https://medium.com/northcoders/make-a-web-scraper-with-aws-lambda-and-the-serverless-framework-807d0f536d5f

// Sending emails through lambda:
// https://aws.amazon.com/premiumsupport/knowledge-center/lambda-send-email-ses/

// Deploying node lambda functions (tldr; zip files only and upload & save through aws gui does the same):
// https://docs.aws.amazon.com/lambda/latest/dg/nodejs-create-deployment-pkg.html

const aws = require('aws-sdk')
const request = require('axios')
const cheerio = require('cheerio')

const emailParams = (data) => ({
  recepient: '',
  source: '',
  subject: 'Lian-li DX-04 is below the requested price!',
  body: `Price now: £${data.price}`,
})

const minAcceptablePrice = 1500
// TODO: Multi-site scraping
const scrapeUrl = 'https://www.overclockers.co.uk/lian-li-dk-04x-electrical-height-adjustable-desk-case-black-ca-747-ll.html'
const elementSelector = '#buy-wrapper strong'

const extractPriceFromHtml = (html) => {
  const $ = cheerio.load(html)
  const price = parseFloat($(elementSelector).text().replace(/[£,* ]/g,''))
  return price
}

const ses = new aws.SES({region: 'eu-west-1'})

const sendSesEmail = (event, context, callback, data) => {
  const params = {
    Destination: {
      ToAddresses: [emailParams(data).recepient]
    },
    Message: {
      Subject: {
        Data: emailParams(data).subject
      },
      Body: {
        Text: {
          Data: emailParams(data).body
        }
      },
    },
    Source: emailParams(data).source
  }

  ses.sendEmail(params, (err, data) => {
    callback(null, {err: err, data: data})
    if (err) {
      console.log(err);
      context.fail(err)
    } else {
      console.log(data);
      context.succeed(event)
    }
  })
}

exports.handler = (event, context, callback) => {
  const promise = new Promise((resolve, reject) => {
    request(scrapeUrl)
      .then(({ data }) => {
        const price = extractPriceFromHtml(data)
        if (price < minAcceptablePrice) {
          sendSesEmail(event, context, callback, { price })
        } else {
          resolve(true)
        }
      })
      .catch((e) => {
        reject(Error(e))
      })
  })
  return promise
}