export default class XRPState {
    private _encoderInputs: Map<number, number> = new Map();

    private _heading = 0;

    constructor() {
        this._encoderInputs.set(0, 0.0);
        this._encoderInputs.set(1, 0.0);
    }

    public setLeftEncoder(val: number) {
        this._encoderInputs.set(0, val);
    }

    public setRightEncoder(val: number) {
        this._encoderInputs.set(1, val);
    }

    public setHeading(val: number) {
        this._heading = val;
    }

    public generateBuffer() {
        const buffers: Buffer[] = [];

        this._encoderInputs.forEach((val, key) => {
            const buf = Buffer.alloc(7);
            buf[0] = 6;
            buf[1] = 0x18;
            buf[2] = key;
            buf.writeInt32BE(val, 3);
            buffers.push(buf);
        });

        const gyroBuf = Buffer.alloc(26);
        gyroBuf[0] = 25;
        gyroBuf[1] = 0x16;
        gyroBuf.writeFloatBE(0, 2);
        gyroBuf.writeFloatBE(0, 6);
        gyroBuf.writeFloatBE(0, 10);
        gyroBuf.writeFloatBE(0, 14);
        gyroBuf.writeFloatBE(0, 18);
        gyroBuf.writeFloatBE(this._heading, 22);

        buffers.push(gyroBuf);
        return Buffer.concat(buffers);
    }
}