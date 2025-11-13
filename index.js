const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceKey.json.json");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      require("../path/to/serviceAccountKey.json")
    ),
  });
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

module.exports = verifyToken;

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.aczt7zj.mongodb.net/rent-wheel?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Welcome to RentWheels API ");
});

async function run() {
  try {
    await client.connect();
    const db = client.db("rent-wheel");
    const carsCollection = db.collection("cars");
    const bookingsCollection = db.collection("booking");
    // ----------------> Cars Api
    app.get("/cars", async (req, res) => {
      const result = await carsCollection.find().toArray();
      res.send(result);
    });
    // ----------------> Cars Api
    app.get("/cars-details/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const result = await carsCollection.findOne({ _id: objectId });
      res.send({
        success: true,
        result,
      });
    });
    // ----------------> Cars Api
    app.get("/featured-cars", async (req, res) => {
      const result = await carsCollection
        .find()
        .sort({ created_at: "desc" })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // ---------------->Add Cars Api
    app.post("/cars", verifyToken, async (req, res) => {
      const data = req.body;
      const result = await carsCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });
    // ---------------->Update Cars Api
    app.put("/cars/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const update = {
        $set: data,
      };
      const result = await carsCollection.updateOne(filter, update);
      res.send({
        success: true,
        result,
      });
    });
    // ---------------->Delete Cars Api
    app.delete("/cars/:id", async (req, res) => {
      const { id } = req.params;
      const result = await carsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send({
        success: true,
        result,
      });
    });
    // ---------------->Bookings car Api Post
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
    //  ---------------->Bookings car Api Get
    app.get("/bookings/:email", async (req, res) => {
      const { email } = req.params;
      const bookings = await bookingsCollection
        .find({ userEmail: email })
        .toArray();
      res.send({ result: bookings });
    });
    //  ---------------->Bookings car Api PATCH
    app.patch("/cars/:id/status", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status } };
      const result = await carsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //  ---------------->Bookings car Api Delete
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const bookingId = req.params.id;
        const booking = await bookingsCollection.findOne({
          _id: new ObjectId(bookingId),
        });
        if (!booking) {
          return res
            .status(404)
            .send({ success: false, message: "Booking not found" });
        }
        await bookingsCollection.deleteOne({ _id: new ObjectId(bookingId) });
        await carsCollection.updateOne(
          { _id: new ObjectId(booking.carId) },
          { $set: { status: "Available" } }
        );

        res.send({ success: true, message: "Booking cancelled successfully!" });
      } catch (error) {
        console.error("Cancel error:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to cancel booking" });
      }
    });

    await db.command({ ping: 1 });
    console.log(" MongoDB connection successful!");
  } catch (err) {
    console.error(" MongoDB connection error:", err);
  }
}

run().catch(console.dir);

app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
