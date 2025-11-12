const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = "mongodb+srv://BillManagement:9N8hPBS8IqBIoyd7@wasin3.w2xfr9.mongodb.net/?appName=Wasin3";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
  tlsAllowInvalidCertificates: true,
});

// Default route
app.get("/", (req, res) => {
  res.send("Smart Bill Management server is running");
});

async function run() {
  try {
    await client.connect();
    const db = client.db("utility_db");

    const billsCollection = db.collection("bills");
    const recentBillsCollection = db.collection("recentBills");
    const usersCollection = db.collection("users");
    const payBillCollection = db.collection("payBill");

    /** USERS API **/
    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;
        const email = newUser.email;

         
        if (!newUser.email || !newUser.name) {
          return res.status(400).send({ message: "Email and name are required fields" });
        }

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(409).send({ message: "User already exists" });
        }

        const result = await usersCollection.insertOne(newUser);
        res.status(201).send({ 
          message: "User created successfully", 
          userId: result.insertedId 
        });
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });
        
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        
        res.send(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    /** BILLS API **/
    app.get("/bills", async (req, res) => {
      try {
        const { category, limit } = req.query;
        const query = {};
        
        if (category) query.category = category;

        let cursor = billsCollection.find(query).sort({ date: -1 });
        if (limit) cursor = cursor.limit(parseInt(limit));

        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching bills:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

     
    app.get("/bills/current-month", async (req, res) => {
      try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 0);
        
        const query = {
          date: {
            $gte: startDate.toISOString().split('T')[0],
            $lte: endDate.toISOString().split('T')[0]
          }
        };

        const result = await billsCollection.find(query).sort({ date: -1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching current month bills:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/bills/:id", async (req, res) => {
      try {
        const id = req.params.id;
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid bill ID" });
        }
        
        const bill = await billsCollection.findOne({ _id: new ObjectId(id) });
        
        if (!bill) {
          return res.status(404).send({ message: "Bill not found" });
        }
        
        res.send(bill);
      } catch (error) {
        console.error("Error fetching bill:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post("/bills", async (req, res) => {
      try {
        const newBill = req.body;
        
        
        const requiredFields = ['title', 'category', 'amount', 'location', 'date'];
        const missingFields = requiredFields.filter(field => !newBill[field]);
        
        if (missingFields.length > 0) {
          return res.status(400).send({ 
            message: `Missing required fields: ${missingFields.join(', ')}` 
          });
        }

         
        if (!newBill.date) {
          newBill.date = new Date().toISOString().split('T')[0];
        }

        const result = await billsCollection.insertOne(newBill);
        res.status(201).send({ 
          message: "Bill created successfully", 
          billId: result.insertedId 
        });
      } catch (error) {
        console.error("Error creating bill:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.patch("/bills/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedBill = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid bill ID" });
        }

        const result = await billsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedBill }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Bill not found" });
        }

        res.send({ message: "Bill updated successfully" });
      } catch (error) {
        console.error("Error updating bill:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.delete("/bills/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid bill ID" });
        }

        const result = await billsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Bill not found" });
        }

        res.send({ message: "Bill deleted successfully" });
      } catch (error) {
        console.error("Error deleting bill:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    /** RECENT BILLS API **/
    app.get("/recentBills", async (req, res) => {
      try {
        const { limit } = req.query;
        let cursor = recentBillsCollection.find().sort({ date: -1 });
        if (limit) cursor = cursor.limit(parseInt(limit));
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching recent bills:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post("/recentBills", async (req, res) => {
      try {
        const recentBill = req.body;
        
        
        if (
          !recentBill.title ||
          !recentBill.category ||
          !recentBill.email ||
          !recentBill.location ||
          !recentBill.amount
        ) {
          return res.status(400).send({ message: "Missing required fields" });
        }

         
        if (!recentBill.date) {
          recentBill.date = new Date().toISOString().split("T")[0];
        }

        const result = await recentBillsCollection.insertOne(recentBill);
        res.status(201).send({ 
          message: "Recent bill added successfully", 
          billId: result.insertedId 
        });
      } catch (error) {
        console.error("Error adding recent bill:", error);
        res.status(500).send({ message: "Failed to add recent bill", error: error.message });
      }
    });

    /** PAY BILL API **/
    app.get("/payBill", async (req, res) => {
      try {
        const result = await payBillCollection.find().sort({ date: -1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching paid bills:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

     
    app.get("/payBill/user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await payBillCollection.find({ email }).sort({ date: -1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching user paid bills:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post("/payBill", async (req, res) => {
      try {
        const payData = req.body;
        
        
        const requiredFields = [
          'email', 'billId', 'amount', 'username', 
          'address', 'phone', 'date'
        ];
        const missingFields = requiredFields.filter(field => !payData[field]);
        
        if (missingFields.length > 0) {
          return res.status(400).send({ 
            message: `Missing required fields: ${missingFields.join(', ')}` 
          });
        }

         
        const phoneRegex = /^01[3-9]\d{8}$/;
        if (!phoneRegex.test(payData.phone)) {
          return res.status(400).send({ 
            message: "Invalid phone number format. Must be a valid Bangladeshi number (01XXXXXXXXX)" 
          });
        }

        
        const existingPayment = await payBillCollection.findOne({ 
          email: payData.email, 
          billId: payData.billId 
        });

        if (existingPayment) {
          return res.status(409).send({ 
            message: "This bill has already been paid" 
          });
        }

        
        payData.paymentDate = new Date();
        payData.status = "completed";

        const result = await payBillCollection.insertOne(payData);
        
        res.status(201).send({ 
          message: "Bill paid successfully!", 
          paymentId: result.insertedId,
          paymentData: payData
        });
        
      } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).send({ 
          message: "Payment processing failed", 
          error: error.message 
        });
      }
    });

    // DELETE Pay Bill
    app.delete("/payBill/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid payment ID" });
        }

        const result = await payBillCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Payment record not found" });
        }

        res.send({ message: "Payment record deleted successfully" });
      } catch (error) {
        console.error("Error deleting payment record:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

     
    app.get("/payBill/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid payment ID" });
        }

        const payment = await payBillCollection.findOne({ _id: new ObjectId(id) });

        if (!payment) {
          return res.status(404).send({ message: "Payment record not found" });
        }

        res.send(payment);
      } catch (error) {
        console.error("Error fetching payment:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });
 
    app.get("/health", async (req, res) => {
      try {
        await client.db("admin").command({ ping: 1 });
        res.status(200).send({ 
          status: "OK", 
          database: "Connected",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).send({ 
          status: "Error", 
          database: "Disconnected",
          error: error.message 
        });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

run().catch(console.dir);

 
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Server listen
app.listen(port, () => {
  console.log(`✅ Utility Bill Management server running on port ${port}`);
});