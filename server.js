import { existsSync, statSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'node:http'

createServer((request, response) => {
  const uri = request.url
  const publicDirs = ['./']
  for (const publicDir of publicDirs) {
    let filePath = join(process.cwd(), publicDir, uri)
    if (existsSync(filePath)) {
      if (statSync(filePath).isDirectory()) {
        filePath = join(filePath, 'index.html')
        const stat = statSync(filePath)
        response.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Length': stat.size
        })
        const readStream = createReadStream(filePath)
        readStream.pipe(response)
      } else {
        const stat = statSync(filePath)
        let mime
        if ((/js$/).test(filePath)) {
          mime = 'text/javascript'
        } else {
          mime = 'text/plain'
        }
        response.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': stat.size
        })
        const readStream = createReadStream(filePath)
        readStream.pipe(response)
      }
      break
    }
  }
}).listen(3070, 'localhost')

console.log('http://localhost:3070')
