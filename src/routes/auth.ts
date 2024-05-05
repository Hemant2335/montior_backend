import express from "express";
const router = express.Router();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import  OTPAuth from "otpauth";
import  encode from "hi-base32";
import  QRCode from "qrcode";
import speakeasy from "speakeasy";
import authentication from "../middlewares/authentication";
require("dotenv").config();


router.post("/login", async (req, res) => {
  const { email, password , browsername , devicename } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      return res.status(400).json({ Status: false, error: "User not found" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ Status: false, error: "Invalid Password" });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "secret");
    const session = await prisma.userSession.create({
      data : {
        userId : user.id,
        isActive : true,
        deviceName : devicename,
        Browser : browsername
      }
    })
    res.json({ Status: true, DeviceId : session.id ,token: token ,  user : {email : user.email , username : user.username , name : user.name , is_verified : user.is_verified}});
    
  } catch (error) {
    console.log(error);
    res.status(400).json({ Status: false, error: "Internal Server Error" });
  }
});

router.get('/sessions', authentication ,async (req, res) => {
  const user = req.body.user;
  const sessions = await prisma.userSession.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
  });
  res.json(sessions);
});

router.post('/sessions/:id', authentication ,async (req, res) => {
  const { id } = req.params;
  try {
    const session = await prisma.userSession.findFirst({
      where : {
        id : id
      }
    })
    res.json({Status : true , session : session});
  } catch (error) {
    res.json({Status : false});
  }
  

})

router.post('/sessions/:id/revoke', authentication ,async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.userSession.delete({
      where : {
        id
      }
    })
    res.json({ Status: true ,message: 'Session revoked' });
  } catch (error) {
    res.json({ Status: false ,message: 'Session revoked' });
  }
  
});


router.post("/register", async (req, res) => {
  const { email, username, name, password} = req.body;

  // Check if email already exists
  const user = await prisma.user.findUnique({
    where: {
      email: req.body.email,
    },
  });
  const user2 = await prisma.user.findUnique({
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
  const hashedpassword = await bcrypt.hash(password, 10);
  // Create user
  try {
    const newuser = await prisma.user.create({
      data: {
        email: email,
        password: hashedpassword,
        name: name,
        username: username,
      },
    });
    console.log(process.env.JWT_SECRET);
    const token = jwt.sign(
      { id: newuser.id },
      process.env.JWT_SECRET || "secret"
    );
    res.json({ Status: true, token: token });
  } catch (error) {
    console.log(error);
    res.status(400).json({ Status: false, error: "Internal Server Error" });
  }
});


router.get("/me", authentication, async (req, res) => {
  const user = req.body.user;
  const newuser = await prisma.user.findFirst({
    where : {
      id : user.id
    }
  })
  res.json({ user : {email : newuser?.email , username : newuser?.username , name : newuser?.name , is_verified : newuser?.is_verified}});
});



// Endpoint to enable two-way authentication
router.post('/enable-2fa', authentication ,async (req, res) => {
  const user = req.body.user;

  // Generate a secret key for the user
  const base32_secret = generate_secret_key();

  // Add the secret key to the user in the database (you should use a database here)
  const userupdate = await prisma.user.update({
    where : {
      id : user.id
    },
    data : {
      base32_secret : base32_secret.base32
    }
  })
  // Generate and send the QR code as a response
  generateQRCodeURL(base32_secret)
    .then((dataURL) => {
        console.log("Scan the QR code with the Google Authenticator app:");
        res.send({URL : dataURL});
    })
    .catch((err) => {
        console.error("Error generating QR code:", err);
    });
});

function generate_secret_key() {
  // Generate a secret key
  const secretKey = speakeasy.generateSecret({ length: 20 });
  return secretKey;
}

function generateQRCodeURL(secret:any) {
  return new Promise((resolve, reject) => {
      QRCode.toDataURL(secret.otpauth_url, (err, dataURL) => {
          if (err) {
              reject(err);
          } else {
              resolve(dataURL);
          }
      });
  });
}


// Endpoint to verify the token
router.post('/verify-2fa',async(req, res) => {
  const { token , email} = req.body;
  const newuser = await prisma.user.findFirst({
    where : {
      email : email
    }
  })
  // Verify the token
  const verified = speakeasy.totp.verify({
      secret: newuser?.base32_secret as string,
      encoding: 'base32',
      token: token,
  });

  if (verified) {
      if(!newuser?.is_verified){
        const userupdate = await prisma.user.update({
          where : {
            email : email
          },
          data : {
            is_verified : true
          }
        })
      }
      const token = jwt.sign({ id: newuser?.id }, process.env.JWT_SECRET || "secret");
      res.json({ Status: true ,token: token , is_verified : newuser?.is_verified});
  } else {
    console.log("Invalid Token");
    res.json({ Status: false, is_verified : newuser?.is_verified});
  }
});

router.post("/check-session" ,async (req, res) => {
  const DeviceId = req.body.DeviceId;
  console.log(DeviceId);
  if(!DeviceId){
    return res.status(400).json({Status : false , error : "No Session Provided"});
  }
  const session = await prisma.userSession.findFirst({
    where : {
      id : DeviceId as string
    }
  })
  console.log(session);
  if(!session){
    return res.status(400).json({Status : false , error : "Invalid Session"});
  }
  res.json({Status : true , session : session});

});




module.exports = router;
