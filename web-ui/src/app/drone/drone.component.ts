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
  lat: string;
  lon: string;
  token: string;
  bids: BidData[] = [];
  selectedBidId: BidData = null;
  status: string;
  accepting = false;

  constructor(private server: ServerService) {
    this.address = '0x96De2B9394bA1894A3a717a75536E9e2d0d1Ec22';
    this.lat = '32.050382';
    this.lon = '34.766149';
  }

  async ngOnInit() {
    interval(500).subscribe(async () => {
      if (!!this.token) {
        this.status = (await this.server.getStatus(this.token).toPromise()).status;
        if (this.status === 'Waiting' && !this.accepting) {
          this.bids = (await this.server.getBids(this.token).toPromise());
        } else {
          this.bids = [];
          this.selectedBidId = null;
        }
      } else {
        this.status = '';
      }
    });
  }

  async register() {
    this.token = await this.server.register({
      address: this.address,
      lat: this.lat,
      lon: this.lon,
    }).toPromise();
  }

  async accept(bidDataId: string) {
    this.accepting = true;
    await this.server.accept(this.token, bidDataId).toPromise();
    this.accepting = false;
  }

  async arrived() {
    await this.server.arrived(this.token).toPromise();
  }

  async cleared() {
    await this.server.cleared(this.token).toPromise();
    this.token = null;
    this.status = '';
  }
}
