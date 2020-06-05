var SecureConf = artifacts.require("./SecureConf.sol");

module.exports = function(deployer) {
  deployer.deploy(SecureConf);
};
