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
  "nodeUrl": "https://<<A NETWORK NODE URL>>"
}
```

This wallet should have enough balance to perform the necessary transactions.
Then run:

```bash
npm i
npm run gen-n-reg
```

Copy the new DAV Identity Address which is printed if all goes well.

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

## Status

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

## Bids

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
      /* BidParams incl. bidId */
    }
  ]
}
```

## Accept

Accept the specified bid. Use the token returned by `/register` to authenticate.

- Method: **POST**
- Path: **/accept/`[bidId]`**
- Headers:
  - **Authorization: Bearer `[drone token]`**
- Response: **(200 Ok)**

## Arrived

Notify that drone has arrived at charger and is ready for charging. Use the token returned by `/register` to authenticate.

- Method: **POST**
- Path: **/arrived**
- Headers:
  - **Authorization: Bearer `[drone token]`**
- Response: **(200 Ok)**
