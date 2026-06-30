import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import helmet from "helmet";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import http from "http";
import cors from "cors";
import mqtt from "mqtt";
import { Server } from "socket.io";
import multer from "multer";
import fs from "fs";
import xlsx from "xlsx";
import reader from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ====================== MESSAGE HISTORY VARIABLES ======================
let messageHistory = []; // Store messages in memory
const MAX_HISTORY = 500; // Limit history to prevent memory issues
// ========================================================================

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3001",
      "https://mqtt-socket-swaja.vercel.app",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  maxHttpBufferSize: 1e8,
});

app.use(
  cors({
    origin: [
      "http://localhost:3001",
  "https://mqtt-socket-swaja.vercel.app",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          "http://localhost:3001",
  "https://mqtt-socket-swaja.vercel.app",
          "ws://localhost:3001",
        ],
      },
    },
  })
);
app.use(express.static("public"));

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });
app.use(express.urlencoded({ extended: false }));

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");
  res.status(200).send("File uploaded successfully.");

  const filePath = req.file?.path;
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const commands = sheetData
    .map((row) => row[Object.keys(row)[0]])
    .filter((command) => command);
  const delays = sheetData
    .map((row) => row[Object.keys(row)[1]])
    .filter((delays) => delays);

  const result = { commands, delays };
  io.emit("sheetdata", result);
  fs.unlinkSync(filePath);
});

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' ws://localhost:3001 http://localhost:3001"
  );
  next();
});

let client;

// ===================== SOCKET CONNECTION =====================
io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  // Allow client to request full message history
  socket.on("requestMessageHistory", () => {
    console.log("Client requested message history");
    socket.emit("messageHistory", messageHistory);
  });

  // Connect to MQTT broker
  socket.on("mqttData", (mqttData) => {
    try {
      const { protocol, ip, port, mqttid, password } = mqttData;
      const connectUrl = `${protocol}://${ip}:${port}`;
      let options = {
        clientId: `swaja_mqttapp_00-45-E2-D7-2A-CE_${Math.random().toString(16).slice(2, 10)}`,
         username: mqttid,
        password,
      };




      // Add TLS options if using mqtts
    if (protocol === "mqtts") {
      
      options = {
        ...options,
        username: mqttid,
        password,
        rejectUnauthorized: false, // verify server certificate
        ca: fs.readFileSync("C:/TLS cERTS/mosq-certs/ca.crt"),    // CA certificate
        cert: fs.readFileSync("C:/TLS cERTS/mosq-certs/client.crt"), // Client certificate
        key: fs.readFileSync( "C:/TLS cERTS/mosq-certs/client.key"),   // Client private key
      };
    } else {
      // Plain MQTT
      options = { ...options, username: mqttid, password };
    }





      client = mqtt.connect(connectUrl, options);
      if (!client) {
        console.log("Mqtt Connection error!");
      } else {
        client.on("connect", () => {
          console.log("MQTT Connected");
          socket.emit("connectionstatus", {
            mqttstatus: "connected",
            id: socket.id,
          });
        });

        client.on("error", (err) => {
          console.error("MQTT Connection Error: ", err);
        });

        // ===== UPDATED MESSAGE HANDLER WITH HISTORY =====
        client.on("message", (topic2, msg) => {
          setImmediate(() => {
            try {
              console.log(`Message received on ${topic2} : ${msg}`);

              // Store message in history
              const messageObj = {
                sender: "Broker",
                message: msg.toString(),
                timestamp: new Date().toISOString(),
                topic: topic2,
              };
              messageHistory.push(messageObj);
              if (messageHistory.length > MAX_HISTORY) {
                messageHistory = messageHistory.slice(-MAX_HISTORY);
              }

              // Send to all clients
              io.emit("message", {
                topic: topic2,
                message2: msg.toString(),
              });

              // Existing AQI processing logic
              const message2 = msg.toString().split("*");
              if (message2[1] == "118") {
                const Data = message2[5] * 256 + message2[4];
                const filePath = "./AQI.xlsx";
                let file = fs.existsSync(filePath)
                  ? reader.readFile(filePath)
                  : reader.utils.book_new();

                const currentDate = new Date().toISOString().split("T")[0];
                const sheetName = `Sheet_${currentDate}`;

                let ws = file.Sheets[sheetName]
                  ? file.Sheets[sheetName]
                  : reader.utils.json_to_sheet([]);
                if (!file.Sheets[sheetName])
                  reader.utils.book_append_sheet(file, ws, sheetName);

                const newData = [
                  { Message: Data, Timestamp: new Date().toLocaleString() },
                ];
                let existingData = reader.utils.sheet_to_json(ws);
                const updatedData = [...existingData, ...newData];
                const updatedSheet = reader.utils.json_to_sheet(updatedData);
                file.Sheets[sheetName] = updatedSheet;
                reader.writeFile(file, filePath);
              }
            } catch (error) {
              console.error("error in receiving message.", error);
            }
          });
        });
      }
    } catch (error) {
      console.error("connection error:", error);
    }
  });

  // Disconnect MQTT
  socket.on("clientEnd", () => {
    if (client) {
      client.end();
      console.log("MQTT DisConnected", socket.id);
      socket.emit("connectionstatus", {
        mqttstatus: "disconnected",
        id: socket.id,
      });
    }
  });

  // Subscribe
  socket.on("SubscribeTopic", (topic2) => {
    if (client) {
      client.subscribe(topic2, (err) => {
        if (err) console.error(`Mqtt subscription error : ${err.message}`);
        else {
          console.log(`Subscribed to topic : ${topic2}`);
          socket.emit("subscribestatus", { status: "subscribed" });
        }
      });
    }
  });

  // Unsubscribe
  socket.on("unSubscribeTopic", (topic2) => {
    if (client) {
      client.unsubscribe(topic2, (err) => {
        if (err) console.error(`Mqtt unsubscription error : ${err.message}`);
        else {
          console.log(`unSubscribed to topic : ${topic2}`);
          socket.emit("subscribestatus", { status: "unsubscribed" });
        }
      });
    }
  });

  // Publish message (with history tracking)
  socket.on("publishmessage", (publishData) => {
    if (client) {
      console.log(publishData.topic1, publishData.message1);
      client.publish(publishData.topic1, publishData.message1, (err) => {
        if (err) {
          console.error(`Mqtt publish error : ${err.message}`);
        } else {
          console.log(
            `Published message: "${publishData.message1}" to topic: "${publishData.topic1}"`
          );

          // Store sent message in history
          const messageObj = {
            sender: "You",
            message: publishData.message1,
            timestamp: new Date().toISOString(),
            topic: publishData.topic1,
          };
          messageHistory.push(messageObj);
          if (messageHistory.length > MAX_HISTORY) {
            messageHistory = messageHistory.slice(-MAX_HISTORY);
          }

          // Existing Excel saving logic
          const filePath = "./messages.xlsx";
          let file = fs.existsSync(filePath)
            ? reader.readFile(filePath)
            : reader.utils.book_new();

          const currentDate = new Date().toISOString().split("T")[0];
          const sheetName = `Sheet_${currentDate}`;
          let ws = file.Sheets[sheetName]
            ? file.Sheets[sheetName]
            : reader.utils.json_to_sheet([]);
          if (!file.Sheets[sheetName])
            reader.utils.book_append_sheet(file, ws, sheetName);

          const newData = [
            {
              Topic: publishData.topic1,
              Message: publishData.message1,
              Timestamp: new Date().toLocaleString(),
            },
          ];
          let existingData = reader.utils.sheet_to_json(ws);
          const updatedData = [...existingData, ...newData];
          const updatedSheet = reader.utils.json_to_sheet(updatedData);
          file.Sheets[sheetName] = updatedSheet;
          reader.writeFile(file, filePath);
        }
      });
    } else {
      console.log("mqtt publish error : Client is not connected.");
    }
  });

  // Save response
  socket.on("saveResponse", (RESPONSE) => {
    const { response1, response2, response3 } = RESPONSE;
    const filePath = "./messages.xlsx";
    let file = fs.existsSync(filePath)
      ? reader.readFile(filePath)
      : reader.utils.book_new();

    const currentDate = new Date().toISOString().split("T")[0];
    const sheetName = `Sheet_${currentDate}`;
    let ws = file.Sheets[sheetName]
      ? file.Sheets[sheetName]
      : reader.utils.json_to_sheet([]);
    if (!file.Sheets[sheetName])
      reader.utils.book_append_sheet(file, ws, sheetName);

    const newData = [
      { ControlNode: response1, Device: response2, Error: response3 },
    ];
    let existingData = reader.utils.sheet_to_json(ws);
    const updatedData = [...existingData, ...newData];
    const updatedSheet = reader.utils.json_to_sheet(updatedData);
    file.Sheets[sheetName] = updatedSheet;
    reader.writeFile(file, filePath);
  });
});
// ===============================================================

server.listen(process.env.PORT, () => {
  console.log(`listening on *: ${process.env.PORT}`);
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com"
        ],

        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],

        imgSrc: [
          "'self'",
          "data:"
        ],

        connectSrc: [
          "'self'",
          "http://localhost:3001",
          "ws://localhost:3001"
        ]
      }
    }
  })
);

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});