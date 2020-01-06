import { SDKFactory, Bid, Mission } from "dav-js";
import { NeedParams, MissionParams, BidParams, ChargingArrivalMessageParams, StatusRequestMessageParams, DroneStatusMessageParams, StartingMessageParams, ChargingStartedMessageParams, ProviderStatusMessageParams, ChargingCompleteMessageParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
const config = require('./env');

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());
const identity = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'drone')).toString());

const Contracts = require('dav-js/dist/Contracts').default;
const { BlockchainType, ContractTypes} = require('dav-js/dist/common-enums');

async function main() {
    try {
        const DAV = SDKFactory({
            apiSeedUrls: config.apiSeedUrls,
            kafkaSeedUrls: config.kafkaSeedUrls,
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
                    try {
                        const signTransactionReceipt = await startMission(mission);
                        console.log('Sign Transaction Receipt', signTransactionReceipt);
                    } catch (err) {
                        console.log(util.inspect(err));
                    }
                    await mission.sendMessage(new ChargingArrivalMessageParams({}));
                }
                else if (message.params instanceof ChargingStartedMessageParams) {
                    console.log('Mission Message', 'Charging Started');
                    await mission.sendMessage(new StatusRequestMessageParams({}));
                }
                else if (message.params instanceof ChargingCompleteMessageParams) {
                    console.log('Mission Message', 'Charging Complete');
                    try {
                        const finalizeTransactionReceipt = await mission.finalizeMission(wallet.private);
                        console.log('Finalize Transaction Receipt', finalizeTransactionReceipt);
                    } catch (err) {
                        console.log(util.inspect(err));
                    }
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

async function startMission(mission: Mission<MissionParams>) {
    try {
        const conf = {
            ...config,
            "ethNodeUrl": wallet.nodeUrl,
            "blockchainType": BlockchainType.test
        }
        // Init web3 object
        const web3 = Contracts.initWeb3(conf);

        // Get contract instance and address
        const { contract, contractAddress } = Contracts.getContract(ContractTypes.basicMission, web3, conf);

        const walletPublicKey = wallet.address;
        const walletPrivateKey = wallet.private;
        // Decreased with 3 zeros
        const TOKEN_AMOUNT = '1500000000000000';

        const missionId = mission.params.id;
        const vehicleId = mission.params.vehicleId;
        const davId = mission.params.neederDavId;

        // const missionId = "0x17dd8DAB56AEd6d98f1B1D811579207C7bB7e132";
        // const vehicleId = "0xed7810D46d0C9Add3B5411Ce3fc22C44c1c07b74";
        // const davId = "0xeaf330D3B6831192A7F7eFCE70a4dF51549Ae300";

        // Get nonce (count) of user tx
        const nonce = await web3.eth.getTransactionCount(walletPublicKey);

        // Get instance of "create" method
        const { encodeABI, estimateGas } = contract.methods.create(missionId, vehicleId, davId, TOKEN_AMOUNT);

        // Get encoded data
        const data = encodeABI()

        // Estimation of gas amount for calling "create" method
        const estimatedGas = await estimateGas({
            "from":     walletPublicKey,
            "to":       contractAddress,
        })

        // Get current average gas price
        const gasPrice = await web3.eth.getGasPrice();

        // Internal method
        const safeGasLimit = Contracts.toSafeGasLimit(estimatedGas);

        // Create tx body for sign
        const tx = {
            "from":     walletPublicKey,
            "to":       contractAddress,
            "nonce":    web3.utils.toHex(nonce),
            "data":     data,
            "gas":      web3.utils.toHex(safeGasLimit),
            "gasPrice": web3.utils.toHex(gasPrice)
        };

        // Sign tx body with private key
        const { rawTransaction } = await web3.eth.accounts.signTransaction(tx, walletPrivateKey);

        // Submit transaction and receive receipt
        const transactionReceipt = await Contracts.sendSignedTransaction(web3, rawTransaction);

        return transactionReceipt;
    }
    catch (err) {
        throw err;
    }
}

main().then(() => { });

function exitOnError(err: any) {
    console.error('Exiting: ', err);
    process.exit(0);
}
