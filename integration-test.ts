import { SDKFactory, Bid, Mission } from "dav-js";
import { NeedParams, MissionParams, BidParams, ChargingArrivalMessageParams, StatusRequestMessageParams, DroneStatusMessageParams, StartingMessageParams, ChargingStartedMessageParams, ProviderStatusMessageParams, ChargingCompleteMessageParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());
const identity = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'drone')).toString());

async function main() {
    try {
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

        const bids = await need.bids<BidParams>();
        bids.subscribe(handleBid, exitOnError);

        console.log('Waiting for Bids...', bids.topic);
    }
    catch (err) {
        exitOnError(err);
    }
}

async function handleBid(bid: Bid<BidParams>): Promise<void> {
    try {
        console.log('Bid', bid);

        const messages = await bid.messages();
        messages.subscribe(message => {
            console.log('Bid Message', message);
        }, exitOnError);

        const missions = await bid.missions();
        missions.subscribe(mission => {
            console.log('Bid Mission', mission);
        }, exitOnError);

        const commitmentConfirmation = await bid.requestCommitment();
        console.log('CommitmentConfirmation', commitmentConfirmation);

        const mission = await bid.accept(new MissionParams({
        }), wallet.private);

        await handleMission(mission);
    }
    catch (err) {
        exitOnError(err);
    }
}

async function handleMission(mission: Mission<MissionParams>) {
    try {
        console.log('Mission', mission);

        const messages = await mission.messages();
        messages.subscribe(async message => {
            try {
                if (message.params instanceof StartingMessageParams) {
                    console.log('Mission Message', 'Starting');
                    // const signTransactionReceipt = await mission.signContract(wallet.private);
                    // console.log('Sign Transaction Receipt', signTransactionReceipt);
                    await mission.sendMessage(new ChargingArrivalMessageParams({}));
                }
                else if (message.params instanceof ChargingStartedMessageParams) {
                    console.log('Mission Message', 'Charging Started');
                    await mission.sendMessage(new StatusRequestMessageParams({}));
                }
                else if (message.params instanceof ChargingCompleteMessageParams) {
                    console.log('Mission Message', 'Charging Complete');
                    // const finalizeTransactionReceipt = await mission.finalizeMission(wallet.private);
                    // console.log('Finalize Transaction Receipt', finalizeTransactionReceipt);
                    process.exit(0);
                }
                else if (message.params instanceof StatusRequestMessageParams) {
                    console.log('Mission Message', 'Status Request');
                    await mission.sendMessage(new DroneStatusMessageParams({ location: { lat: 1, long: 1 } }));
                }
                else if (message.params instanceof ProviderStatusMessageParams) {
                    console.log('Mission Message', 'Provider Status', message.params);
                }
                else {
                    console.log('Mission Message', message);
                }
            }
            catch (err) {
                exitOnError(err);
            }
        }, exitOnError);
    }
    catch (err) {
        exitOnError(err);
    }
}

main().then(() => { });

function exitOnError(err: any) {
    console.error('Exiting: ', err);
    process.exit(0);
}
