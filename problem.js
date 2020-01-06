const Contracts = require('dav-js/dist/Contracts').default;
const ContractTypes = require('dav-js/dist/common-enums').ContractTypes;
const TOKEN_AMOUNT = '1500000000000000000';
const config = JSON.parse('{"ethNodeUrl":"https://ropsten.infura.io/v3/cf1ec96d0a9444d5823e74a616a2661c","apiSeedUrls":["http://localhost:8080"],"kafkaSeedUrls":["localhost:9092"],"identityTtl":10000,"needTypeTtl":10000,"needTtl":10000,"missionConsumerTtl":10000,"missionProviderTtl":10000,"kafkaBrowserPollingInterval":1000,"kafkaBrowserRequestTimeout":500,"blockchainType":"ropsten"}');
// Price is not needed, because "create" method is not payable
const vehicleId = "0x8B22d48bd7fFBcE764c60AE2a78128427973DAdB";
const walletPrivateKey = "0xdef8211ef5db29669dec108025a4431c3e038108f84bb0ac860bb435e8af5e4d";
const davId = "0x96De2B9394bA1894A3a717a75536E9e2d0d1Ec22";

// MissionId should be bytes32 (not address), and unique for each time.
const missionId = "0xc211c5a6edec0053c30ed966ee6372cbc18e6b790d821f00c59dd8ad9b405ed6";

// Public key of provided private key (walletPrivateKey)
const walletPublicKey = "0x114E9991E39d53EF54E63A7c54005DC069f9C2dE"

main();
async function main() {
    try {
        // Init web3 object
        const web3 = Contracts.initWeb3(config);

        // Get contract instance and address
        const { contract, contractAddress } = Contracts.getContract(
            ContractTypes.basicMission,
            web3,
            config);

        // Before calling "create" method is important to call "approveMission" method and wait for block comfirmation,
        // otherwise transaction will be failed by contract
        // await Contracts.approveMission(davId, walletPrivateKey, config)

        // Get nonce (count) of user tx
        const nonce = await web3.eth.getTransactionCount(walletPublicKey)

        // Get instance of "create" method
        const { encodeABI, estimateGas } = contract.methods.create(
            missionId,
            vehicleId,
            davId,
            TOKEN_AMOUNT);

        // Get encoded data
        const data = encodeABI()

        // Estimation of gas amount for calling "create" method
        const estimatedGas = await estimateGas({
            "from": walletPublicKey,
            "to": contractAddress,
        })

        // Get current average gas price
        const gasPrice = await web3.eth.getGasPrice();

        // Internal method
        const safeGasLimit = Contracts.toSafeGasLimit(estimatedGas);

        // Create tx body for sign
        const tx = {
            "from": walletPublicKey,
            "to": contractAddress,
            "nonce": web3.utils.toHex(nonce),
            "data": data,
            "gas": web3.utils.toHex(safeGasLimit),
            "gasPrice": web3.utils.toHex(gasPrice)
        };

        // Sign tx body with private key
        const { rawTransaction } = await web3.eth.accounts.signTransaction(tx, walletPrivateKey);

        // Submit transaction and receive receipt
        const transactionReceipt = await Contracts.sendSignedTransaction(web3, rawTransaction);

        console.log("Tx hash", transactionReceipt.transactionHash)
    }
    catch (err) {
        console.log(err);
    }
}