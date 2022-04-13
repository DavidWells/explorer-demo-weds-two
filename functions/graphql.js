/* Proxy call to Vendia GraphQL API */
const https = require('https')
const { URL } = require('url')
const { inspect } = require('util')
const { VENDIA_API_URL, VENDIA_API_KEY } = process.env

exports.handler = async (event) => {
  let data
  try {
    data = await callApi(event.body)
    log(data)
  } catch (err) {
    console.log('API Error')
    log(err)
    return {
      statusCode: err.status,
      body: (err.data) ? err.data : { error: err.message } 
    }
  }
  return {
    statusCode: 200,
    body: data
  }
}

function callApi(body) {
  const url = new URL(VENDIA_API_URL)
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: url.host,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VENDIA_API_KEY,
      },
      'maxRedirects': 20
    }

    const req = https.request(options, function (res) {
      let chunks = []
      res.on("data", (chunk) => {
        chunks.push(chunk);
      })

      res.on("end", (chunk) => {
        var body = Buffer.concat(chunks)
        resolve(body.toString())
      })

      res.on("error", (error) => {
        console.error(error)
      })
    })
    req.on('error', (e) => {
      console.log("Error : " + e.message)
      reject(e)
    })

    req.write(body)
    req.end()
  })
}

function log(info) {
  console.log(inspect(info, {showHidden: false, depth: null}))
}