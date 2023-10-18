export default class Watchdog {
    private _lastFeedTime = 0;
    private _wdTimeout = 500;
    private _lastSatisfiedState = false;

    feed() {
        if (!this._lastSatisfiedState) {
            console.log("[WD] F -> T");
        }
        this._lastSatisfiedState = true;
        this._lastFeedTime = Date.now();
    }

    satisfied() {
        if (Date.now() - this._lastFeedTime < this._wdTimeout) {
            if (!this._lastSatisfiedState) {
                console.log("[WD] F -> T");
            }
            this._lastSatisfiedState = true;
            return true;
        }

        if (this._lastSatisfiedState) {
            console.log("[WD] T -> F");
        }

        this._lastSatisfiedState = false;
        return false;
    }
}