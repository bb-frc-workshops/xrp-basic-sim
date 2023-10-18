import express, { Express } from "express";
import dotenv from "dotenv";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { parse } from "url";
import { WebSocketServer, WebSocket } from "ws";
import XRPSim from "./xrp-sim";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8000;

const xrp: XRPSim = new XRPSim();

function generateXRPStateMessage() {
    return JSON.stringify({
        type: "RobotState",
        payload: {
            enabled: xrp.getEnabled(),
            leftMotor: xrp.getLeftMotorValue(),
            rightMotor: xrp.getRightMotorValue()
        }
    });
}

function generateActiveSimMessage() {
    return JSON.stringify({
        type: "ActiveSim",
        payload: {}
    });
}

app.use("/", express.static(path.join(__dirname, "../public")));
app.use(express.json());

const httpServer = app.listen(port, () => {
    console.log(`[SERVER] Server running at http://localhost:${port}`);
})

const wsServer = new WebSocketServer({ noServer: true });
const activeWSConnections: Map<string, WebSocket> = new Map();

wsServer.on("connection", (ws, request) => {
    const wsID = uuidv4();

    activeWSConnections.set(wsID, ws);

    ws.send(generateXRPStateMessage());

    if (activeWSConnections.size === 1) {
        ws.send(generateActiveSimMessage());
    }

    ws.on("error", (err) => {
        console.log(`[WS] Error: ${err.message}`);
        ws.close();
        activeWSConnections.delete(wsID);

        if (activeWSConnections.size === 1) {
            broadcastWS(generateActiveSimMessage());
        }
    });

    ws.on("close", (code, reason) => {
        console.log(`[WS] Connection Closed (${code}) - ${reason}`);
        activeWSConnections.delete(wsID);

        if (activeWSConnections.size === 1) {
            broadcastWS(generateActiveSimMessage());
        }
    });

    ws.on("message", (data) => {
        // Sensor data TODO
        try {
            const messageJson = JSON.parse(data.toString());

            if (messageJson.type === "SensorData") {
                const payload = messageJson.payload;
                xrp.setHeading(payload.heading);
                xrp.setLeftEncoderValue(payload.leftEncoder);
                xrp.setRightEncoderValue(payload.rightEncoder);
                
            }
        } catch (err) {

        }
    });
});

httpServer.on("upgrade", (request, socket, head) => {
    if (!request.url) {
        socket.destroy();
        return;
    }

    const { pathname } = parse(request.url);

    if (pathname === "/xrp-sim") {
        wsServer.handleUpgrade(request, socket, head, (ws) => {
            wsServer.emit("connection", ws, request);
        });
    }
    else {
        socket.destroy();
    }
});

function broadcastWS(msg: string) {
    activeWSConnections.forEach((ws) => {
        ws.send(msg);
    });
}

setInterval(() => {
    broadcastWS(generateXRPStateMessage());
}, 20);