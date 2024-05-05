import { NextFunction, Request  , Response} from "express"
import jwt from "jsonwebtoken"
require("dotenv").config();

const authentication = async(req : Request , res : Response , next : NextFunction) =>{
    const token = req.headers.authorization || req.cookies.token;
    console.log(token);
    if(!token){
        return res.status(401).json({Status : false , error : "No Token Provided"})
    }
    try{
        const user = jwt.verify(token , process.env.JWT_SECRET || "secret");
        req.body.user = user;
        next();
    }catch(error){
        console.log(error);
        return res.status(401).json({Status : false , error : "Unauthorized"})
    }
}


export default authentication;