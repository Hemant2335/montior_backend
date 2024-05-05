"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authentication_1 = __importDefault(require("../middlewares/authentication"));
router.get("/", authentication_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield prisma.post.findMany();
        res.json(posts);
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ Status: false, error: "Internal Server Error" });
    }
}));
router.post("/create", authentication_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, content } = req.body;
    try {
        const post = yield prisma.post.create({
            data: {
                title,
                content,
            },
        });
        res.json(post);
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ Status: false, error: "Internal Server Error" });
    }
}));
module.exports = router;
