const http = require('http')
const { Sequelize } = require('sequelize');


const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain; charset=utf8'})
    res.end('MoveIn')
})

const PORT = 3000
const HOST = 'localhost'

server.listen(PORT, HOST, () =>{
    console.log(`Сервер: http://${HOST}:${PORT}`)
})

const sequelize = new Sequelize('movein', 'kostia', 'ZhekaFat69', {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize.authenticate()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Connection error:', err));