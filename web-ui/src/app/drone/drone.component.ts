import { Component, OnInit } from '@angular/core';
import { ServerService, BidData } from '../server.service';
import { interval } from 'rxjs';

@Component({
  selector: 'app-drone',
  templateUrl: './drone.component.html',
  styleUrls: ['./drone.component.scss']
})
export class DroneComponent implements OnInit {
  address: string;
  lat: number;
  lon: number;
  token: string = null;
  bids: BidData[] = [];
  selectedBidId: BidData = null;
  status: string = null;
  accepting = false;
  charger = null;
  drone = {
    lat: 32.0494226,
    lon: 34.7636385
  };
  droneSpeed = {
    lat: 0,
    lon: 0,
  };
  balance: string;
  logs: string[];
  arrivedAtCharger = false;

  constructor(private server: ServerService) {
    this.address = '0x96De2B9394bA1894A3a717a75536E9e2d0d1Ec22';
    this.logs = [];
    this.lat = this.drone.lat;
    this.lon = this.drone.lon;
  }

  async ngOnInit() {
    interval(500).subscribe(async () => {
      if (!!this.token) {
        const res = (await this.server.getStatus(this.token).toPromise());
        this.status = res.status;
        this.logs = res.logs;
        this.balance = res.balance;
        if (this.status === 'Moving') {
          this.accepting = false;
          if (Math.abs(this.drone.lat - this.charger.lat) < 0.0001 && Math.abs(this.drone.lon - this.charger.long) < 0.0001) {
            this.arrivedAtCharger = true;
          } else {
            this.drone.lat += this.droneSpeed.lat;
            this.drone.lon += this.droneSpeed.lon;
          }
        }
        if (this.status === 'Waiting' && !this.accepting) {
          this.bids = (await this.server.getBids(this.token).toPromise());
        } else {
          this.bids = [];
          this.selectedBidId = null;
        }
      } else {
        this.status = '';
        this.logs = [];
      }
    });
  }

  async register() {
    this.token = await this.server.register({
      address: this.address,
      lat: this.lat.toString(),
      lon: this.lon.toString(),
    }).toPromise();
    this.drone = {
      lat: this.lat,
      lon: this.lon
    };
  }

  async accept(bidDataId: string) {
    const bid = this.bids.find((b) => b.id === bidDataId);
    this.charger = bid.entranceLocation;
    this.droneSpeed.lat = (this.charger.lat - this.drone.lat) / 60.0;
    this.droneSpeed.lon = (this.charger.long - this.drone.lon) / 60.0;

    this.accepting = true;
    await this.server.accept(this.token, bidDataId).toPromise();
  }

  async arrived() {
    await this.server.arrived(this.token).toPromise();
  }

  async cleared() {
    await this.server.cleared(this.token).toPromise();
    this.token = null;
    this.status = '';
    this.charger = null;
    this.arrivedAtCharger = false;
  }

  trackByLatLon(i: number, bidData: BidData) {
    return `${bidData.entranceLocation.lat}_${bidData.entranceLocation.long}`;
  }
}
