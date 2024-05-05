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
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const qrcode_1 = __importDefault(require("qrcode"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const authentication_1 = __importDefault(require("../middlewares/authentication"));
require("dotenv").config();
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield prisma.user.findUnique({
            where: {
                email: email,
            },
        });
        if (!user) {
            return res.status(400).json({ Status: false, error: "User not found" });
        }
        const valid = yield bcrypt_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ Status: false, error: "Invalid Password" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET || "secret");
        if (!user.is_verified) {
            res.cookie("token", token);
            const session = yield prisma.userSession.create({
                data: {
                    userId: user.id,
                    isActive: true,
                    deviceName: "Mobile"
                }
            });
            res.cookie("DeviceId", session.id);
        }
        res.json({ Status: true, token: token, user: { email: user.email, username: user.username, name: user.name, is_verified: user.is_verified } });
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ Status: false, error: "Internal Server Error" });
    }
}));
router.get('/sessions', authentication_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.body.user;
    const sessions = yield prisma.userSession.findMany({
        where: {
            userId: user.id,
            isActive: true,
        },
    });
    res.json(sessions);
}));
router.post('/sessions/:id', authentication_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const session = yield prisma.userSession.findFirst({
            where: {
                id: id
            }
        });
        res.json({ Status: true, session: session });
    }
    catch (error) {
        res.json({ Status: false });
    }
}));
router.post('/sessions/:id/revoke', authentication_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.userSession.delete({
            where: {
                id
            }
        });
        res.json({ Status: true, message: 'Session revoked' });
    }
    catch (error) {
        res.json({ Status: false, message: 'Session revoked' });
    }
}));
router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, username, name, password } = req.body;
    // Check if email already exists
    const user = yield prisma.user.findUnique({
        where: {
            email: req.body.email,
        },
    });
    const user2 = yield prisma.user.findUnique({
        where: {
            username: req.body.username,
        },
    });
    if (user) {
        return res
            .status(400)
            .json({ Status: false, error: "User already exists" });
    }
    if (user2) {
        return res
            .status(400)
            .json({ Status: false, error: "Username already Taken" });
    }
    // Encrypt password
    const hashedpassword = yield bcrypt_1.default.hash(password, 10);
    // Create user
    try {
        const newuser = yield prisma.user.create({
            data: {
                email: email,
                password: hashedpassword,
                name: name,
                username: username,
            },
        });
        console.log(process.env.JWT_SECRET);
        const token = jsonwebtoken_1.default.sign({ id: newuser.id }, process.env.JWT_SECRET || "secret");
        res.cookie("token", token);
        res.json({ Status: true, token: token });
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ Status: false, error: "Internal Server Error" });
    }
}));
router.get("/me", authentication_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.body.user;
    const newuser = yield prisma.user.findFirst({
        where: {
            id: user.id
        }
    });
    res.json({ user: { email: newuser === null || newuser === void 0 ? void 0 : newuser.email, username: newuser === null || newuser === void 0 ? void 0 : newuser.username, name: newuser === null || newuser === void 0 ? void 0 : newuser.name, is_verified: newuser === null || newuser === void 0 ? void 0 : newuser.is_verified } });
}));
// Endpoint to enable two-way authentication
router.post('/enable-2fa', authentication_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.body.user;
    // Generate a secret key for the user
    const base32_secret = generate_secret_key();
    // Add the secret key to the user in the database (you should use a database here)
    const userupdate = yield prisma.user.update({
        where: {
            id: user.id
        },
        data: {
            base32_secret: base32_secret.base32
        }
    });
    // Generate and send the QR code as a response
    generateQRCodeURL(base32_secret)
        .then((dataURL) => {
        console.log("Scan the QR code with the Google Authenticator app:");
        res.send({ URL: dataURL });
    })
        .catch((err) => {
        console.error("Error generating QR code:", err);
    });
}));
function generate_secret_key() {
    // Generate a secret key
    const secretKey = speakeasy_1.default.generateSecret({ length: 20 });
    return secretKey;
}
function generateQRCodeURL(secret) {
    return new Promise((resolve, reject) => {
        qrcode_1.default.toDataURL(secret.otpauth_url, (err, dataURL) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(dataURL);
            }
        });
    });
}
// Endpoint to verify the token
router.post('/verify-2fa', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, email } = req.body;
    const newuser = yield prisma.user.findFirst({
        where: {
            email: email
        }
    });
    // Verify the token
    const verified = speakeasy_1.default.totp.verify({
        secret: newuser === null || newuser === void 0 ? void 0 : newuser.base32_secret,
        encoding: 'base32',
        token: token,
    });
    if (verified) {
        if (!(newuser === null || newuser === void 0 ? void 0 : newuser.is_verified)) {
            const userupdate = yield prisma.user.update({
                where: {
                    id: email
                },
                data: {
                    is_verified: true
                }
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: newuser === null || newuser === void 0 ? void 0 : newuser.id }, process.env.JWT_SECRET || "secret");
        res.cookie("token", token);
        const session = yield prisma.userSession.create({
            data: {
                userId: newuser === null || newuser === void 0 ? void 0 : newuser.id,
                isActive: true,
                deviceName: "Mobile"
            }
        });
        res.cookie("DeviceId", session.id);
        console.log("New Session Created", session);
        res.json({ Status: true, token: token, is_verified: newuser === null || newuser === void 0 ? void 0 : newuser.is_verified });
    }
    else {
        console.log("Invalid Token");
        res.json({ Status: false, is_verified: newuser === null || newuser === void 0 ? void 0 : newuser.is_verified });
    }
}));
router.get("/check-session", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const DeviceId = req.cookies.DeviceId;
    console.log(DeviceId);
    if (!DeviceId) {
        return res.status(400).json({ Status: false, error: "No Session Provided" });
    }
    const session = yield prisma.userSession.findFirst({
        where: {
            id: DeviceId
        }
    });
    console.log(session);
    if (!session) {
        return res.status(400).json({ Status: false, error: "Invalid Session" });
    }
    res.json({ Status: true, session: session });
}));
module.exports = router;
