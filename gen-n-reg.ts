import { SDKFactory, Config } from "dav-js";
const eth = require('ethereumjs-wallet');
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());

async function main() {
    const generatedKey = eth.generate();
    const identity = {
        private: generatedKey.getPrivateKeyString(),
        public: generatedKey.getPublicKeyString(),
        address: generatedKey.getChecksumAddressString(),
    };
    const keyFile = path.join(os.homedir(), '.dav', 'drone');
    fs.writeFileSync(keyFile, JSON.stringify(identity));

    const DAV = SDKFactory({ ethNodeUrl: wallet.nodeUrl });

    const res = await DAV.registerIdentity(identity.address, wallet.address, wallet.private, identity.private);

    console.log(`New DAV identity: ${identity.address}`);
}

main().then(() => { console.log('Done') }, (err) => { console.error(err) });