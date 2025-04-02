const http = require('http')

const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain; charset=utf8'})
    res.end('MoveIn')
})

const PORT = 3000
const HOST = 'localhost'

server.listen(PORT, HOST, () =>{
    console.log(`Сервер: http://${HOST}:${PORT}`)
})