import dgram, { RemoteInfo, Socket } from "node:dgram";
import Watchdog from "./watchdog";
import XRPState from "./xrp-state";

const UDP_PORT = 3540;
const udpConn = dgram.createSocket("udp4");

export default class XRPSim {
    private _udpConn: Socket;
    
    private _inboundSeq = 0; // From WPILib
    private _outboundSeq = 0; // From us

    private _remoteSocketInfo: RemoteInfo | null = null;

    private _enabled = false;

    private _watchdog: Watchdog = new Watchdog();
    private _wdIntervalToken: NodeJS.Timeout | null = null;
    private _sendIntervalToken: NodeJS.Timeout | null = null;

    private _xrpState: XRPState = new XRPState();

    private _leftMotorVal = 0;
    private _rightMotorVal = 0;

    constructor() {
        this._udpConn = dgram.createSocket("udp4");
        this._wdIntervalToken = setInterval(() => {
            if (!this._watchdog.satisfied()) {
                this._remoteSocketInfo = null;
                this._inboundSeq = 0;
            }
        }, 100);

        this._sendIntervalToken = setInterval(() => {
            this._sendToWPILib();
        }, 50);

        this._udpConn.on("message", (msg, rinfo) => {
            this._remoteSocketInfo = rinfo;

            if (msg.length < 3) return;

            const seq = msg.readUInt16BE(0);
            if (seq < this._inboundSeq && 65535 - this._inboundSeq > 5) {
                return;
            }

            this._inboundSeq = seq;

            const ctrl = msg[2];
            this.setEnabled(ctrl === 1);

            this._watchdog.feed();

            const taggedData = msg.subarray(3, msg.length);
            const taggedDataSize = taggedData.length;

            let ptr = 0;

            while (ptr < taggedDataSize) {
                const dataSize = taggedData[ptr];
                ptr += 1;

                const tag = taggedData[ptr];

                const payloadStart = ptr + 1;
                const payloadEnd = ptr + dataSize;
                const payload = taggedData.subarray(payloadStart, payloadEnd);

                ptr = payloadEnd;

                switch (tag) {
                    case 0x12: { // Motor
                        const ch = payload[0];
                        const val = payload.readFloatBE(1);

                        if (ch === 0) {
                            this._leftMotorVal = val;
                        }
                        else if (ch === 1) {
                            // Invert the right motor value
                            this._rightMotorVal = -val;
                        }
                    } break;
                }
            }
        });

        this._udpConn.on("listening", () => {
            const address = this._udpConn.address();
            console.log(`[UDP] Listening on ${address.address}:${address.port}`);
        });

        this._udpConn.bind(UDP_PORT);
    }

    public getLeftMotorValue(): number {
        return this._leftMotorVal;
    }

    public getRightMotorValue(): number {
        return this._rightMotorVal;
    }

    public setEnabled(val: boolean) {
        if (!this._enabled && val) {
            console.log("[XRP] Setting to ENABLED");
        }
        else if (this._enabled && !val) {
            console.log("[XRP] Setting to DISABLED");
        }

        this._enabled = val;
    }

    public getEnabled(): boolean {
        return this._enabled;
    }

    public setHeading(hdg: number) {
        this._xrpState.setHeading(hdg);
    }

    public setLeftEncoderValue(val: number) {
        this._xrpState.setLeftEncoder(val);
    }

    public setRightEncoderValue(val: number) {
        this._xrpState.setRightEncoder(val);
    }

    private _sendToWPILib() {
        if (this._remoteSocketInfo !== null) {
            const header = Buffer.alloc(3);
            header.writeUInt16BE(this._outboundSeq, 0);

            const sendBuf = Buffer.concat([header, this._xrpState.generateBuffer()]);
            this._udpConn.send(sendBuf, this._remoteSocketInfo.port, this._remoteSocketInfo.address, (err) => {
                if (err) {
                    console.log(err);
                }
            });
            this._outboundSeq = (this._outboundSeq + 1) & 0xFFFF;
        }
    }
}