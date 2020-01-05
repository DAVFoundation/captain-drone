const Contracts = require('dav-js/dist/Contracts').default;
const ContractTypes = require('dav-js/dist/common-enums').ContractTypes;
const TOKEN_AMOUNT = '1500000000000000000';
const config = JSON.parse('{"ethNodeUrl":"https://ropsten.infura.io/v3/cf1ec96d0a9444d5823e74a616a2661c","apiSeedUrls":["http://localhost:8080"],"kafkaSeedUrls":["localhost:9092"],"identityTtl":10000,"needTypeTtl":10000,"needTtl":10000,"missionConsumerTtl":10000,"missionProviderTtl":10000,"kafkaBrowserPollingInterval":1000,"kafkaBrowserRequestTimeout":500,"blockchainType":"ropsten"}');
const price = ["1"];
const vehicleId = "0x8B22d48bd7fFBcE764c60AE2a78128427973DAdB";
const walletPrivateKey = "0xdef8211ef5db29669dec108025a4431c3e038108f84bb0ac860bb435e8af5e4d";
const davId = "0x96De2B9394bA1894A3a717a75536E9e2d0d1Ec22";
const missionId = "0x9d2C47DEEf08116f3aAc02b8e4C9b5841b615125";

main();
async function main() {
    try {
        const fullPrice = Contracts.calculatePrice(price);
        const web3 = Contracts.initWeb3(config);
        const { contract, contractAddress } = Contracts.getContract(
            ContractTypes.basicMission,
            web3,
            config,
        );
        const { encodeABI, estimateGas } = await contract.methods.create(
            missionId,
            vehicleId,
            davId,
            TOKEN_AMOUNT,
        );
        const encodedABI = encodeABI();
        const gasPrice = await web3.eth.getGasPrice();
        const estimatedGas = await estimateGas({
            from: davId,
            to: contractAddress,
            value: fullPrice,
        });
        const safeGasLimit = Contracts.toSafeGasLimit(estimatedGas);
        const tx = {
            data: encodedABI,
            to: contractAddress,
            from: davId,
            gas: safeGasLimit,
            value: fullPrice,
            gasPrice,
        };
        const { rawTransaction } = await web3.eth.accounts.signTransaction(
            tx,
            walletPrivateKey,
        );
        const transactionReceipt = await Contracts.sendSignedTransaction(
            web3,
            rawTransaction,
        );
    }
    catch (err) {
        console.log(err);
    }
}