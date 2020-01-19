import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface RegisterData {
  address: string;
  lat: string;
  lon: string;
}

export interface StatusData {
  status: string;
  logs: string[];
  balance: string;
}

export interface BidData {
  id: string;
  price: string[];
  entranceLocation: { lat: number, long: number };
}

export interface BidsData {
  status: string;
  bids: BidData[];
}

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  constructor(private http: HttpClient) {
  }
  started;

  private getUrl(path) {
    return `${environment.serverUrl}${path}`;
  }

  register(data: RegisterData) {
    return this.http.post(this.getUrl('/register'), data, { responseType: 'text' });
  }

  getStatus(token: string) {
    return this.http.get<StatusData>(this.getUrl('/status'), {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    });
  }
  getBids(token: string) {
    return this.http.get<BidsData>(this.getUrl('/bids'), {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    }).pipe(map(bidsData => bidsData.bids));
  }

  accept(token: string, bidDataId: string) {
    return this.http.post(this.getUrl(`/accept/${bidDataId}`), {}, {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    });
  }

  arrived(token: string) {
    return this.http.post(this.getUrl('/arrived'), {}, {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    });
  }

  cleared(token: string) {
    return this.http.post(this.getUrl('/clear'), {}, {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    });
  }
}
