# captain-drone

# Setup

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
