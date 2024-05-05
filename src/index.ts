import express from 'express';
const app = express();
import cookieParser = require('cookie-parser');
import cors from "cors"
import WebSocket, { WebSocketServer } from "ws";

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: ["https://monitordevices.vercel.app", "http://localhost:3000"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/auth', require('./routes/auth'));

const httpserver = app.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});

const wss = new WebSocket.Server({ server: httpserver });


wss.on('connection', function connection(ws) {
  ws.on('error', console.error);
  ws.onopen = function open() {
    console.log('connected');
  }

  ws.on('message', function message(message, isBinary) {
    console.log(message);
    const data = JSON.parse(message.toString());
    console.log(data.type);
    switch(data.type){
      case "Add" :
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      case "Remove" : 
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
    
  });

  ws.send(JSON.stringify({ Msg: "Welcome to websocket server with Users" }));
});
