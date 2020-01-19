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
  token: string;
  bids: BidData[] = [];
  selectedBidId: BidData = null;
  status: string;
  accepting = false;
  charger = null;
  balance: string;
  logs: string[];

  constructor(private server: ServerService) {
    this.address = '0x96De2B9394bA1894A3a717a75536E9e2d0d1Ec22';
    this.lat = 32.0494226;
    this.lon = 34.7636385;
    this.logs = [];
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
  }

  async accept(bidDataId: string) {
    const bid = this.bids.find((b) => b.id === bidDataId);
    this.charger = bid.entranceLocation;
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
  }

  trackByLatLon(i: number, bidData: BidData) {
    return `${bidData.entranceLocation.lat}_${bidData.entranceLocation.long}`;
  }
}
