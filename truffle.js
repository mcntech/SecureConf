const PrivateKeyProvider = require("truffle-privatekey-provider");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
      gas: 6000000,
      gasPrice: 10000000000
    },
    geth: {
      //provider: () => new HDWalletProvider(process.env.MNENOMIC, "https://goerli.infura.io/v3/" + process.env.INFURA_API_KEY),
      provider: () => new PrivateKeyProvider(process.env.PRIVATE_KEY, "http://localhost:7545"),
      network_id: "*",
      gas: 3000000,
      gasPrice: 10000000000
    },
    goerli: {
      provider: () => new PrivateKeyProvider(process.env.PRIVATE_KEY, "https://goerli.infura.io/v3/" + process.env.INFURA_API_KEY),
      network_id: 5,
      gas: 3000000,
      gasPrice: 10000000000
    },
    mainnet: {
      provider: () => new HDWalletProvider(process.env.MNENOMIC, "https://mainnet.infura.io/v3/" + process.env.INFURA_API_KEY),
      network_id: 1,
      gas: 3000000,
      gasPrice: 10000000000
    },
  },
  compilers: {
    solc: {
      version: "0.4.24",
    },
  },
};
