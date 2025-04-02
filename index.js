const http = require("http");
const app = require("./src/app"); // Підключаємо app.js з папки src

const PORT = process.env.PORT || 5000;
const HOST = "localhost";

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Сервер запущено: http://${HOST}:${PORT}`);
});
