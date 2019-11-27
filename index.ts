import { SDKFactory } from "dav-js";
import { NeedParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());
const identity = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'drone')).toString());

async function main() {

    const DAV = SDKFactory({
        apiSeedUrls: ['http://localhost:8080'],
        kafkaSeedUrls: ['localhost:9092'],
        ethNodeUrl: wallet.nodeUrl
    });

    const drone = await DAV.getIdentity(identity.address);
    console.log('Drone', drone);

    const need = await drone.publishNeed(new NeedParams({
        location: {
            lat: 32.050382,
            long: 34.766149
        }
    }));

    const bids = await need.bids();
    bids.subscribe(bid => {
        console.log('Bid', bid);
    });

    console.log('Waiting for Bids...', bids.topic);
}

main().then(() => { }, (err) => { console.error('Failed', err); process.exit(0); });