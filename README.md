# captain-drone

## Setup

Run in bash:

```bash
mkdir ~/.dav
touch ~/.dav/wallet
```

Open and edit `~/.dav/wallet` and save with following content:

```json
{
  "private": "0x<<YOUR WALLET PRIVATE KEY>>",
  "address": "0x<<YOUR WALLET ADDRESS>>",
  "nodeUrl": "https://<<A NETWORK NODE URL>>",
  "networkType": "<<ropsten/...>>",
  "apiSecret": "<<SOME SECRET PHRASE>>"
}
```

This wallet should have enough balance to perform the necessary transactions.
Then run:

```bash
npm i
npm run gen-n-reg
```

Copy the new DAV Identity Address which is printed if all goes well.

## Ropsten Faucet

```bash
curl -X POST  -H "Content-Type: application/json" -d '{"toWhom":"<<ADDRESS>>"}' https://ropsten.faucet.b9lab.com/tap
```

## Usage

Follow [these instructions](https://github.com/DAVFoundation/missioncontrol) to have a locally running DAVNN cluster using Minikube.
After that you should have a port-forwarding setup for the DAVNN server.
These are required for the captain-drone server to communicate with captain-charger server.

Run:

```bash
npm run start-server
```

In another terminal:

```bash
npm run start-ui
```

## API

### Register

Register a new drone to find a charging mission.
The returned token must be kept for future interactions with the API.

- Method: **POST**
- Path: **/register**
- Body (json):

```json
{
  "address": "" /* Drone DAV ID */,
  "lat": "" /* Search location latitude */,
  "lon": "" /* Search location longitude */
}
```

- Response (text): **drone token**

### Status

Access current status for drone. Use the token returned by `/register` to authenticate.

- Method: **GET**
- Path: **/status**
- Headers:
  - **Authorization: Bearer `[drone token]`**
- Response (text): **Waiting/Moving/Charging/Complete**
  - **Waiting**: Drone is waiting for a charging mission.
  - **Moving**: Drone is committed to a mission and need to arrive at charger.
  - **Charging**: Drone is charging.
  - **Complete**: Drone has completed charging and needs to take-off.

### Bids

Access current list of available bids for drone. Use the token returned by `/register` to authenticate.

- Method: **GET**
- Path: **/bids**
- Headers:
  - **Authorization: Bearer `[drone token]`**
- Response (json):

```json
{
  "status": "",
  "bids": [
    {
      /* BidParams incl. id */
    }
  ]
}
```

### Accept

Accept the specified bid. Use the token returned by `/register` to authenticate.

- Method: **POST**
- Path: **/accept/`[bidId]`**
- Headers:
  - **Authorization: Bearer `[drone token]`**
- Response: **(200 Ok)**

### Arrived

Notify that drone has arrived at charger and is ready for charging. Use the token returned by `/register` to authenticate.

- Method: **POST**
- Path: **/arrived**
- Headers:
  - **Authorization: Bearer `[drone token]`**
- Response: **(200 Ok)**

### Clear

Notify that drone has left the charger. Use the token returned by `/register` to authenticate.

- Method: **POST**
- Path: **/clear**
- Headers:
  - **Authorization: Bearer `[drone token]`**
- Response: **(200 Ok)**

### Example

Register a drone charging need:

```bash
curl -w "\n" -X POST localhost:3001/register -H"Content-Type:application/json" -d'{"address":"0x96De2B9394bA1894A3a717a75536E9e2d0d1Ec22","lat":"32.050382","lon":"34.766149"}'
```

Store returned token into environment:

```bash
export DRONE_TOKEN=<<TOKEN>>
```

Get available bids:

```bash
curl -w "\n" -X GET localhost:3001/bids -H"Authorization: Bearer ${DRONE_TOKEN}"
```

Get drone status:

```bash
curl -w "\n" -X GET localhost:3001/status -H"Authorization: Bearer ${DRONE_TOKEN}"
```

Choose an appropriate bid and copy the bid `id` (E.g. `ca0ab3cc-02c7-40f2-bb0d-d96b07081b89`):

```bash
curl -w "\n" -X POST localhost:3001/accept/<<BID-ID>> -H"Authorization: Bearer ${DRONE_TOKEN}"
```

When status becomes `Moving` and drone arrived at destination:

```bash
curl -w "\n" -X POST localhost:3001/arrived -H"Authorization: Bearer ${DRONE_TOKEN}"
```

When status becomes `Complete` and drone has taken-off / cleared the charger:

```bash
curl -w "\n" -X POST localhost:3001/clear -H"Authorization: Bearer ${DRONE_TOKEN}"
```
