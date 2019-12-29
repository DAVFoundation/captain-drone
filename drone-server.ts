import * as express from "express"
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import { Server } from '@overnightjs/core';
import { Logger } from '@overnightjs/logger';
import DroneController from './controllers/drone-controller';

export default class DroneServer extends Server {
    constructor() {
        super(true);

        this.app.use(cors({
            origin: ['http://localhost:4201'],
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        super.addControllers([new DroneController()]);
    }

    public start(port: number): void {
        this.app.get('*', (req: express.Request, res: express.Response) => {
            res.status(200).send('Ok');
        });
        this.app.listen(port, () => {
            Logger.Imp(`Drone server started on port ${port}`);
        });
    }
}
