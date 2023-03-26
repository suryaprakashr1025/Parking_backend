const express = require("express")
const dotenv = require("dotenv").config()
const cors = require("cors")
const bcrypt = require("bcryptjs")
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET
const mongodb = require("mongodb")
const MongoClient = mongodb.MongoClient
const url = process.env.db


const app = express()

app.use(cors({
    origin: "https://master--melodic-taiyaki-72296c.netlify.app",
}))

app.use(express.json())



const authorize = (req, res, next) => {
    try {
      
        if (req.headers.authorization) {
  
            // const head = req.headers.authorization
    
            // const splithead = head.split(" ")[1]
     
            const decodedToken = jwt.verify(req.headers.authorization, JWT_SECRET)
        
            if (decodedToken) {
                next()
            }
        } else {
            res.status(401).json({ message: "unauthorized" })
        }
    } catch (error) {
        console.log(error.message)
        res.status(401).json({ message: "unauthorized1" })
    }
}

app.post("/register", async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")

        const findusername = await db.collection("register").find({ username: req.body.username }).toArray()
        const findemail = await db.collection("register").find({ email: req.body.email }).toArray()
        const findphone = await db.collection("register").find({ phone: req.body.phone }).toArray()

        if (findusername.length === 0 && findemail.length === 0 && findphone.length === 0) {

            const salt = await bcrypt.genSalt(10)
            console.log(salt)

            const hash = await bcrypt.hash(req.body.password, salt)
            console.log(hash)

            req.body.password = hash

            const reg = await db.collection("register").insertOne(req.body)

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.US,
                    pass: process.env.PS
                }
            })

            const mailOptions = {
                from: process.env.US,
                to: req.body.email,
                subject: "Parking App",
                html: `<h3>Hi,${req.body.username}</h3>
                <h5>Your Successfully Registered</h5>`
            }

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error)
                } else {
                    console.log(info)
                }
            })

            transporter.close()

            res.json({ message: "Registered successfully" })

        } else {
            res.json({ message: "sorry! username,email and phoneno already exists" })
        }

        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "Register error" })
    }
})



app.get("/adminlist", async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        const adminlist = await db.collection("register").find().toArray()
        res.json(adminlist)
        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})

app.post("/login", async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        const findusername = await db.collection("register").findOne({ username: req.body.username })
        console.log(findusername)

        if (findusername) {
            console.log(findusername.email)
          

            const token = jwt.sign({ email: findusername.email }, JWT_SECRET, { expiresIn: "1d" })
            console.log(token)

            const compare = await bcrypt.compare(req.body.password, findusername.password)
            console.log("compare:" + compare)


            if (compare) {
                res.json({ message: "success", token })
            } else {
                res.json({ message: "username and password is incorrect" })
            }

        } else {
            res.json({ message: "username and password is incorrect" })
        }
    } catch (error) {
        res.status(500).json({ message: "Login error" })
    }
})

app.delete("/deleteadmin/:registerid", async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        const findvehicle = await db.collection("register").findOne({ _id: new mongodb.ObjectId(req.params.registerid) })
        if (findvehicle) {
            const deleteadmin = await db.collection("register").deleteOne({ _id: new mongodb.ObjectId(req.params.registerid) })
            res.json({ message: "Deleted successfully" })
        } else {
            res.json({ message: "vehicle is not found" })
        }
        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})

app.post("/createvehicle",authorize, async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        const findvehicleno = await db.collection("vehicle").find({ vehicleNo: req.body.vehicleNo }).toArray()
        console.log(findvehicleno.length)

        const checkStatus = findvehicleno.some(findVehicle => {
            return findVehicle.status === "Active"
        })

        console.log(checkStatus)
        if (!checkStatus) {

            const day = new Date().getDate()
            const month = new Date().getMonth() + 1
            const year = new Date().getFullYear()
            const hours = new Date().getHours()
            const minutes = new Date().getMinutes()
            const seconds = new Date().getSeconds()

            req.body.startdate = `${month}/${day}/${year}`,
            req.body.starttime = `${hours}:${minutes}:${seconds}`
            req.body.status = "Active"
            const vehicle = await db.collection("vehicle").insertOne(req.body)
            res.json({ message: "vehicle created successfully" })
        } else {
            res.json({ message: "vehicle no is already exits" })
        }

        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})


app.get("/allvehicle",authorize, async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        
        // const {limit = 3,page = 1 } = req.query
        const allVehicle = await db.collection("vehicle").find({ status: { $nin: ["Deactive"] } }).toArray()
                                                        //  .limit(limit * 1)
                                                        //  .skip((page - 1)*page)
        if (allVehicle) {
            res.json(allVehicle)
        } else {
            res.json({ message: "something went wrong" })
        }
        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})

app.get("/findallvehicle/vehicleno",authorize, async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        
       
        const allVehicle = await db.collection("vehicle").find({vehicleNo:req.vehicleNo},{ status: { $nin: ["Deactive"] } }).toArray()
        if (allVehicle) {
            res.json(allVehicle)
        } else {
            res.json({ message: "something went wrong" })
        }
        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})


app.get("/getvehicle/:vehicleid",authorize, async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")

        const getVehicle = await db.collection("vehicle").find({ _id: new mongodb.ObjectId(req.params.vehicleid) }).toArray()

        if (getVehicle) {
            res.json(getVehicle)
        } else {
            res.json({ message: "No vehicles" })
        }

        await connection.close()

    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})

app.put("/endvehicle/:vehicleid", async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        const findvehicle = await db.collection("vehicle").findOne({ _id: new mongodb.ObjectId(req.params.vehicleid) })


        if (findvehicle) {

            const day = new Date().getDate()
            const month = new Date().getMonth() + 1
            const year = new Date().getFullYear()
            const hours = new Date().getHours()
            const minutes = new Date().getMinutes()
            const seconds = new Date().getSeconds()

            const stdateAndsttime = `${findvehicle.startdate.split("/").join(", ")} ${findvehicle.starttime}`

            const endateAndentime = `${month}, ${day}, ${year} ${hours}:${minutes}:${seconds}`



            dt1 = new Date(stdateAndsttime);
            dt2 = new Date(endateAndentime);

            const diff = ((dt2.getTime() - dt1.getTime()) / 1000) / 60;

            const totalMinutes = Math.abs(Math.round(diff))
            const totalHours = Math.abs(Math.round(diff / 60))
            const totalDays = Math.abs((Math.round(diff / 60)) / 24)



            let totalAmount;
            if (totalHours <= 24) {
                totalAmount = 20
            } else if (totalHours > 24) {
                totalAmount = totalHours * 1
            }

            if (findvehicle.status === "Active") {
                const endVehicle = await db.collection("vehicle").updateOne({ _id: new mongodb.ObjectId(req.params.vehicleid) }, {
                    $set: {

                        endDate: `${month}/${day}/${year}`,
                        endTime: `${hours}:${minutes}:${seconds}`,
                        totalAmount: totalAmount,
                        status: "Deactive"
                    }
                })
                res.json({ message: "End time is over" })
            } else {
                res.json({ message: "Status is not active" })
            }


        } else {
            res.json({ message: "vehicle is not found" })
        }
        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})

app.put("/updatevehicle/:vehicleid",authorize,  async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        const findvehicle = await db.collection("vehicle").findOne({ _id: new mongodb.ObjectId(req.params.vehicleid) })
        if (findvehicle) {
            const updatevehicle = await db.collection("vehicle").updateOne({ _id: new mongodb.ObjectId(req.params.vehicleid) }, { $set: req.body })
            res.json({ message: "Updated successfully" })
        } else {
            res.json({ message: "vehicle is not found" })
        }
        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})

app.delete("/deletevehicle/:vehicleid", authorize, async (req, res) => {
    try {
        const connection = await MongoClient.connect(url)
        const db = connection.db("parking")
        const findvehicle = await db.collection("vehicle").findOne({ _id: new mongodb.ObjectId(req.params.vehicleid) })
        if (findvehicle) {
            const deletevehicle = await db.collection("vehicle").deleteOne({ _id: new mongodb.ObjectId(req.params.vehicleid) })
            res.json({ message: "Deleted successfully" })
        } else {
            res.json({ message: "vehicle is not found" })
        }
        await connection.close()
    } catch (error) {
        res.status(500).json({ message: "something went wrong" })
    }
})

app.listen(3022)