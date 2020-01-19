import { Request, Response } from 'express';
import { Controller, Middleware, Get, Post } from '@overnightjs/core';
import { JwtManager, ISecureRequest } from '@overnightjs/jwt';
import { Logger } from '@overnightjs/logger';
import Identity from 'dav-js/dist/Identity';
import { Observable } from 'dav-js/dist/common-types';
import { SDKFactory, Bid, Mission, Need, Message } from "dav-js";
import { NeedParams, MissionParams, BidParams, ChargingArrivalMessageParams, StatusRequestMessageParams, DroneStatusMessageParams, StartingMessageParams, ChargingStartedMessageParams, ProviderStatusMessageParams, ChargingCompleteMessageParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import MessageParams from 'dav-js/dist/drone-charging/MessageParams';
import * as util from 'util'
import getDavBalance from '../get-dav-balance';
const config = require('../env');

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());
const DAV = SDKFactory({
    apiSeedUrls: config.apiSeedUrls,
    kafkaSeedUrls: config.kafkaSeedUrls,
    ethNodeUrl: wallet.nodeUrl
});

const jwtMgr = new JwtManager(wallet.apiSecret, '10h');

enum Status {
    Waiting = 'Waiting',
    Moving = 'Moving',
    Charging = 'Charging',
    Complete = 'Complete'
}

interface DroneInfo {
    identity: Identity;
    status: Status;
    bids: { [key: string]: Bid<BidParams> };
    need?: Need<NeedParams>;
    bidsStream?: Observable<Bid<BidParams>>;
    mission?: Mission<MissionParams>;
    logs: string[];
}

@Controller('')
export default class DroneController {
    private drones: { [key: string]: DroneInfo } = {};

    @Get('status')
    @Middleware(jwtMgr.middleware)
    public async status(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const droneInfo = this.drones[id];
            if (!droneInfo) {
                res.status(404).json({});
                return;
            }

            const balance = await getDavBalance(droneInfo.identity.davId, wallet.nodeUrl, wallet.networkType);
            res.status(200).json({
                status: droneInfo.status || Status.Waiting,
                logs: droneInfo.logs,
                balance
            });
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    @Get('bids')
    @Middleware(jwtMgr.middleware)
    public bids(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const droneInfo = this.drones[id];
            if (!droneInfo) {
                res.status(404).json({});
                return;
            }

            res.status(200).json({
                status: droneInfo.status,
                bids: Object.values(droneInfo.bids).map(bid => bid.params)
            });
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    @Post('register')
    public async register(req: Request, res: Response) {
        try {
            const { address, lat, lon } = req.body;

            if (!!this.drones[address]) {
                res.status(400).json({});
                return;
            }

            const drone = await DAV.getIdentity(address);

            const droneInfo: DroneInfo = {
                identity: drone,
                status: Status.Waiting,
                bids: {},
                logs: []
            };

            DroneController.log(droneInfo, `Drone ${util.inspect(drone)}`);

            this.drones[address] = droneInfo;

            const need = await drone.publishNeed<NeedParams>(new NeedParams({
                location: {
                    lat: parseFloat(lat),
                    long: parseFloat(lon)
                }
            }));
            droneInfo.need = need;

            const bids = await need.bids<BidParams>();
            droneInfo.bidsStream = bids;

            bids.subscribe(bid => DroneController.handleBid(droneInfo, bid));

            const key = jwtMgr.jwt({
                id: address
            });

            return res.status(200).send(key);
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    private static log(droneInfo: DroneInfo, msg: string) {
        droneInfo.logs.push(msg);
        Logger.Info(msg);
    }

    private static async handleBid(droneInfo: DroneInfo, bid: Bid<BidParams>) {
        try {
            DroneController.log(droneInfo, `Got Bid ${util.inspect(bid)} for ${util.inspect(droneInfo)}`);

            const messages = await bid.messages();
            messages.subscribe(message => {
                DroneController.log(droneInfo, `Bid Message ${util.inspect(message)} for ${util.inspect(droneInfo)}`);
            });

            const missions = await bid.missions();
            missions.subscribe(mission => {
                DroneController.log(droneInfo, `Bid Mission ${util.inspect(mission)} for ${util.inspect(droneInfo)}`);
            });

            droneInfo.bids[bid.params.id] = bid;
        }
        catch (err) {
            Logger.Err(err, true);
        }
    }

    @Post('accept/:bidId')
    @Middleware(jwtMgr.middleware)
    public async accept(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const bidId = req.params.bidId;
            const droneInfo = this.drones[id];
            if (!droneInfo || !droneInfo.bids[bidId]) {
                res.status(404).json({});
                return;
            }
            const bid = droneInfo.bids[bidId];

            const commitmentConfirmation = await bid.requestCommitment();
            DroneController.log(droneInfo, `CommitmentConfirmation ${util.inspect(commitmentConfirmation)} for ${util.inspect(droneInfo)}`);

            const mission = await bid.accept(new MissionParams({}), wallet.private);

            DroneController.log(droneInfo, `Mission ${util.inspect(mission)} for ${util.inspect(droneInfo)}`);
            droneInfo.mission = mission;

            const messages = await mission.messages();
            messages.subscribe(message => DroneController.handleMissionMessage(droneInfo, message));

            res.status(200).json({});
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    private static async handleMissionMessage(droneInfo: DroneInfo, message: Message<MessageParams>) {
        try {
            const mission = droneInfo.mission as Mission<MissionParams>;
            if (message.params instanceof StartingMessageParams) {
                DroneController.log(droneInfo, `Mission Message Starting for ${util.inspect(droneInfo)}`);
                try {
                    const signTransactionReceipt = await mission.signContract(wallet.address, wallet.private);
                    DroneController.log(droneInfo, `Sign Transaction Receipt ${util.inspect(signTransactionReceipt)} for ${util.inspect(droneInfo)}`);
                }
                catch (err) {
                    Logger.Err(err, true);
                }
                droneInfo.status = Status.Moving;
            }
            else if (message.params instanceof ChargingStartedMessageParams) {
                DroneController.log(droneInfo, `Mission Message Charging Started for ${util.inspect(droneInfo)}`);
                // await mission.sendMessage(new StatusRequestMessageParams({}));
                droneInfo.status = Status.Charging;
            }
            else if (message.params instanceof ChargingCompleteMessageParams) {
                DroneController.log(droneInfo, `Mission Message Charging Complete for ${util.inspect(droneInfo)}`);
                try {
                    const finalizeTransactionReceipt = await mission.finalizeMission(wallet.address, wallet.private);
                    DroneController.log(droneInfo, `Finalize Transaction Receipt ${util.inspect(finalizeTransactionReceipt)} for ${util.inspect(droneInfo)}`);
                }
                catch (err) {
                    Logger.Err(err, true);
                }
                droneInfo.status = Status.Complete;
            }
            else if (message.params instanceof StatusRequestMessageParams) {
                DroneController.log(droneInfo, `Mission Message Status Request for ${util.inspect(droneInfo)}`);
                await mission.sendMessage(new DroneStatusMessageParams({ location: { lat: 1, long: 1 } }));
            }
            else if (message.params instanceof ProviderStatusMessageParams) {
                DroneController.log(droneInfo, `Mission Message Provider Status ${util.inspect(message.params)} for ${util.inspect(droneInfo)}`);
            }
            else {
                DroneController.log(droneInfo, `Mission Message ${util.inspect(message)} for ${util.inspect(droneInfo)}`);
            }
        }
        catch (err) {
            Logger.Err(err, true);
        }
    }

    @Post('arrived')
    @Middleware(jwtMgr.middleware)
    public async arrived(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const droneInfo = this.drones[id];
            if (!droneInfo || !droneInfo.mission) {
                res.status(404).json({});
                return;
            }
            const mission = droneInfo.mission;
            await mission.sendMessage(new ChargingArrivalMessageParams({}));

            res.status(200).json({});
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    @Post('clear')
    @Middleware(jwtMgr.middleware)
    public async clear(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const droneInfo = this.drones[id];
            if (!droneInfo || !droneInfo.mission) {
                res.status(404).json({});
                return;
            }

            delete this.drones[id];

            res.status(200).json({});
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }
}
