# xrp-basic-sim

## Requirements

* A NodeJS installation (LTS version is fine)

## Basic Usage

Upon cloning this repo, `cd` into the checkout folder and run `npm install`. (You only have to do this once)

After this, for subsequent runs, do:

```
$ npm run build
$ npm run start
```

Then visit `http://localhost:8000` to display the "simulator". 

In your robot project's `build.gradle` file, find the line that says `wpi.sim.envVar("HALSIMXRP_HOST", "192.168.42.1")` and change the IP address to `127.0.0.1` instead
