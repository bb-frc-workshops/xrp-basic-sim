const ROBOT_SIZE = 40; // 40px
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 500;

class Robot {
    constructor() {
        this._position = {
            x: ARENA_WIDTH / 2,
            y: ARENA_HEIGHT / 2
        };

        this._robotElem = document.getElementById("robot");

        this._leftSpeed = 0;
        this._rightSpeed = 0;
        this._bearing = 0;
    }

    get robotDivPosition() {
        return {
            x: this._position.x - (ROBOT_SIZE / 2),
            y: this._position.y - (ROBOT_SIZE / 2)
        }
    }

    get position() {
        return this._position;
    }

    set position(pos) {
        this._position = pos;

        if (pos.x < ROBOT_SIZE / 2 || pos.y < ROBOT_SIZE / 2 || 
            pos.x + (ROBOT_SIZE / 2) > ARENA_WIDTH ||
            pos.y + (ROBOT_SIZE / 2) > ARENA_HEIGHT) {
            
            this.leftSpeed = 0;
            this.rightSpeed = 0;

            if (pos.x < ROBOT_SIZE / 2) {
                pos.x = ROBOT_SIZE / 2;
            }

            if (pos.y < ROBOT_SIZE / 2) {
                pos.y = ROBOT_SIZE / 2;
            }

            if (pos.x + (ROBOT_SIZE / 2) > ARENA_WIDTH) {
                pos.x = ARENA_WIDTH - (ROBOT_SIZE / 2);
            }

            if (pos.y + (ROBOT_SIZE / 2) > ARENA_HEIGHT) {
                pos.y = ARENA_HEIGHT - (ROBOT_SIZE / 2);
            }
        }

        this.update();
    }

    get bearing() {
        return this._bearing;
    }

    set bearing(val) {
        this._bearing = val;
        this.update();
    }

    get leftSpeed() {
        return this._leftSpeed;
    }

    set leftSpeed(val) {
        this._leftSpeed = val;
    }

    get rightSpeed() {
        return this._rightSpeed;
    }

    set rightSpeed(val) {
        this._rightSpeed = val;
    }

    resetPosition() {
        this.position = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2};
        this.bearing = 0;
    }

    update() {
        const top = this.robotDivPosition.y;
        const left = this.robotDivPosition.x;

        const transformStr = `translate(${left}px, ${top}px) rotate(${this._bearing}deg)`;
        this._robotElem.style.transform = transformStr;
    }

    _processTick(timeDelta) {
        const timeInSec = timeDelta / 1000;

        const newPos = _calculateNewPosition(this._position, this._bearing, 
                            this._leftSpeed, this._rightSpeed, timeInSec);
        
        let newBearing = newPos.bearing;
        if (newBearing >= 360) {
            newBearing -= 360;
        }
        else if (newBearing < 0) {
            newBearing += 360;
        }

        this.bearing = newBearing;
        this.position = newPos.position;
    }
}

function _calculateNewPosition(prevPos, prevBearing, leftSpeed, rightSpeed, timeInSec) {
    const plusFactor = leftSpeed + rightSpeed;
    const minusFactor = rightSpeed - leftSpeed;
    const theta0 = (prevBearing - 90)/180.0 * Math.PI;
    const ret = {};

    if (leftSpeed !== rightSpeed) {
        // Calculate the angle
        const theta = theta0 - ((minusFactor * timeInSec) / ROBOT_SIZE);
        ret.bearing = theta / Math.PI * 180 + 90;

        ret.position = {
            x: prevPos.x - ((ROBOT_SIZE * plusFactor) / (2 * minusFactor))
                * (Math.sin(theta) - Math.sin(theta0)),
            y: prevPos.y + ((ROBOT_SIZE * plusFactor) / (2 * minusFactor))
                * (Math.cos(theta) - Math.cos(theta0))
        }
    }
    else {
        ret.bearing = prevBearing;
        ret.position = {
            x: (plusFactor / 2) * Math.cos(theta0) * timeInSec + prevPos.x,
            y: prevPos.y + (plusFactor / 2) * Math.sin(theta0) * timeInSec
        }
    }

    return ret;
}

window.onload = (e) => {

const robot = new Robot();
robot.update();

let shouldSendSensorData = false;

const _resetRobotButton = document.getElementById("reset-robot");
_resetRobotButton.onclick = (e) => {
    e.preventDefault();
    robot.resetPosition();
}

const ws = new WebSocket("ws://" + location.host + "/xrp-sim");
ws.addEventListener("open", (event) => {

});

ws.addEventListener("message", (event) => {
    try {
        const messageJson = JSON.parse(event.data);

        if (messageJson.type === "ActiveSim") {
            shouldSendSensorData = true;
        }
        else if (messageJson.type === "RobotState") {
            const payload = messageJson.payload;

            let leftMotor = 0;
            let rightMotor = 0;
            
            if (payload.enabled) {
                leftMotor = payload.leftMotor * 100.0;
                rightMotor = payload.rightMotor * 100.0;
            }

            robot.leftSpeed = leftMotor;
            robot.rightSpeed = rightMotor;
        }
    } catch (err) {

    }
});

// Robot speed goes from -100 to 100

let _lastTime = Date.now();
setInterval(() => {
    const currTime = Date.now();
    const deltaTime = currTime - _lastTime;
    
    robot._processTick(deltaTime);

    _lastTime = currTime;
}, 10);

};