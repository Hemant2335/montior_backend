"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const cookieParser = require("cookie-parser");
const cors_1 = __importDefault(require("cors"));
const ws_1 = __importDefault(require("ws"));
app.use(express_1.default.json());
app.use(cookieParser());
app.use((0, cors_1.default)({
    credentials: true,
    origin: ["https://brainopfrontend.vercel.app", "http://localhost:3000"]
}));
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.use('/api/auth', require('./routes/auth'));
const httpserver = app.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
});
const wss = new ws_1.default.Server({ server: httpserver });
wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
    ws.onopen = function open() {
        console.log('connected');
    };
    ws.on('message', function message(message, isBinary) {
        console.log(message);
        const data = JSON.parse(message.toString());
        console.log(data.type);
        switch (data.type) {
            case "Add":
                wss.clients.forEach(function each(client) {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            case "Remove":
                wss.clients.forEach(function each(client) {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
        }
    });
    ws.send(JSON.stringify({ Msg: "Welcome to websocket server with Users" }));
});
