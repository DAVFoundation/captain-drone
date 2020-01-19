const Web3 = require('web3');
const contractJsonDAVToken = require('dav-js/dist/contracts/DAVToken.json');

export default async function getDavBalance(address: string, ethNodeUrl: string, networkType: string): Promise<string> {
  const web3 = new Web3(new Web3.providers.HttpProvider(ethNodeUrl));
  const abi = contractJsonDAVToken.abi;
  const contractAddress = contractJsonDAVToken.networks['ropsten'].address;
  const contractDAVToken = new web3.eth.Contract(abi, contractAddress);
  const contractMethod = contractDAVToken.methods.balanceOf(address);
  const method = await contractMethod;
  const result: string = await new Promise((resolve, reject) => {
    method.call((err: any, res: string) => {
      if (!err) {
        resolve(res);
      }
      else {
        reject(err);
      }
    });
  });
  return result;
}
