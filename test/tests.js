var SecureConf = artifacts.require('./SecureConf.sol')
const truffleAssert = require('truffle-assertions');
const EthUtil = require('ethereumjs-util');
const Ecccrypto = require('eccrypto');
const Wallet = require('ethereumjs-wallet');
const Tx = require('ethereumjs-tx');

const BN = web3.utils.BN;

//let contractAccount = "0x0000000000000000000000000000000000000100"; 

function removeTrailing0x(str) {
    if (str.startsWith('0x'))
        return str.substring(2);
    else return str;
}

function addTrailing0x(str) {
    if (!str.startsWith('0x'))
        return '0x' + str;
    else return str;
}

//
// 32 byte privateKey without 0x prefix
//
publicKeyOfPrivateKey = function(privateKey) {
    privateKey = addTrailing0x(privateKey);
    const publicKeyBuffer = EthUtil.privateToPublic(privateKey);
    return publicKeyBuffer.toString('hex');
}

//
// 64 byte public key without 0x prefix
//
encryptWithPublicKey = function(publicKey, message) {

    // ensure its an uncompressed publicKey
    //publicKey = decompress(publicKey);
	//console.log(publicKey);
    // re-add the compression-flag
    const pubString = '04' + removeTrailing0x(publicKey);
	//console.log(pubString);
	buff = new Buffer(pubString, 'hex');
	//console.log(buff);
    return Ecccrypto.encrypt(
        new Buffer(pubString, 'hex'),
        Buffer(message)
    ).then(encryptedBuffers => {
        const encrypted = {
            iv: encryptedBuffers.iv.toString('hex'),
            ephemPublicKey: encryptedBuffers.ephemPublicKey.toString('hex'),
            ciphertext: encryptedBuffers.ciphertext.toString('hex'),
            mac: encryptedBuffers.mac.toString('hex')
        };
        return encrypted;
    });
}

//
// 32 byte private key
// encrypted (iv,ephem, pub mac) as strings
//
decryptWithPrivateKey = function(privateKey, encrypted) {

    // remove trailing '0x' from privateKey
    const twoStripped = removeTrailing0x(privateKey);

    const encryptedBuffer = {
        iv: new Buffer(encrypted.iv, 'hex'),
        ephemPublicKey: new Buffer(encrypted.ephemPublicKey, 'hex'),
        ciphertext: new Buffer(encrypted.ciphertext, 'hex'),
        mac: new Buffer(encrypted.mac, 'hex')
    };


    return Ecccrypto.decrypt(
        new Buffer(twoStripped, 'hex'),
        encryptedBuffer
    ).then(decryptedBuffer => decryptedBuffer.toString());
}

const price = web3.utils.toWei('0.02', 'ether');

async function registerConference(confContract, ownerWallet, drmWallet) {	
	const gasPrice = web3.eth.gasPrice;
	nonce = await web3.eth.getTransactionCount(ownerWallet.getAddressString());
	callData = await confContract.contract.methods.registerConference(
					"http://demo.zeeth.io/movie1.m3u8", 
					"thumb",
					"Bigbuck Bunny",
					"A good movie", 
					295, 10, 1, 1234, 
					drmWallet.getAddressString()).encodeABI();

	const rawTx = {
		nonce: nonce,
		gasPrice: gasPrice,
		gasLimit: 3000000,
		gas:      1000000,          
		to:       confContract.address,
		data:     callData,
		from:     ownerWallet.getAddressString()
	}	
	tx = new Tx(rawTx)
	tx.sign(ownerWallet.getPrivateKey())		
	const serializedTx = tx.serialize().toString('hex')
	resp = await web3.eth.sendSignedTransaction('0x' + serializedTx)
	recpt = await web3.eth.getTransactionReceipt(resp.transactionHash);
	return recpt;
}

async function registerParticipant(confContract, userWallet) {
	const gasPrice = web3.eth.gasPrice;
	nonce = await web3.eth.getTransactionCount(userWallet.getAddressString());
	callData = await confContract.contract.methods.registerParticipant(
					10, 1, userWallet.getPublicKeyString()).encodeABI();

	const rawTx = {
		nonce: nonce,
		gasPrice: gasPrice,
		gasLimit: 3000000,
		gas:      1000000,          
		to:       confContract.address,
		data:     callData,
		from:     userWallet.getAddressString()
	}	
	tx = new Tx(rawTx)
	tx.sign(userWallet.getPrivateKey())		
	const serializedTx = tx.serialize().toString('hex')
	resp = await web3.eth.sendSignedTransaction('0x' + serializedTx)
	recpt = await web3.eth.getTransactionReceipt(resp.transactionHash);
	return recpt;
}

async function purchaseConference(confContract, confId, userWallet) {
	const gasPrice = web3.eth.gasPrice;
	const price = web3.utils.toWei("295", "wei");
	nonce = await web3.eth.getTransactionCount(userWallet.getAddressString());
	callData = await confContract.contract.methods.purchaseConference(
					confId).encodeABI();

	const rawTx = {
		nonce: nonce,
		gasPrice: gasPrice,
		gasLimit: 3000000,
		gas:      1000000,          
		to:       confContract.address,
		data:     callData,
		value:    price,
		from:     userWallet.getAddressString()
	}
	tx = new Tx(rawTx)
	tx.sign(userWallet.getPrivateKey())		
	const serializedTx = tx.serialize().toString('hex')
	resp = await web3.eth.sendSignedTransaction('0x' + serializedTx)
	recpt = await web3.eth.getTransactionReceipt(resp.transactionHash);
	return recpt;
}

async function grantViewToken(confContract, ownerWallet, confId, userWallet, drmToken) {
	var encDrmToken = await encryptWithPublicKey(userWallet.getPublicKeyString(), drmToken);
	const gasPrice = web3.eth.gasPrice;
	nonce = await web3.eth.getTransactionCount(ownerWallet.getAddressString());
	callData = await confContract.contract.methods.grantViewToken(
		userWallet.getAddressString(), confId, JSON.stringify(encDrmToken)).encodeABI();

	const rawTx = {
		nonce:    nonce,
		gasPrice: gasPrice,
		gasLimit: 3000000,
		gas:      1000000,          
		to:       confContract.address,
		data:     callData,
		from:     ownerWallet.getAddressString()
	}
	tx = new Tx(rawTx)
	tx.sign(ownerWallet.getPrivateKey())		
	const serializedTx = tx.serialize().toString('hex')
	resp = await web3.eth.sendSignedTransaction('0x' + serializedTx)
	recpt = await web3.eth.getTransactionReceipt(resp.transactionHash);
	return recpt;
}

async function getDrmToken(confContract, confId, userWallet) {
	let {conferenceid, cgms, drm} = await confContract.contract.methods.getConferenceDrm(confId).call({from: userWallet.getAddressString()});
	var decbuff = await decryptWithPrivateKey(userWallet.getPrivateKeyString(), JSON.parse(drm));
	return decbuff;
}

let mConf;
user1 = Wallet.fromPrivateKey(EthUtil.toBuffer('0x23e27d71064e10c137f1e920f1f3ef094d866c65266b0737d86415f27ebf758a', 'hex'));
user2 = Wallet.fromPrivateKey(EthUtil.toBuffer('0xf3fbada4a3de5107e54762f22c04a99309c6899e9dacfd6f2c0dc015b1e46559', 'hex'));
user3 = Wallet.fromPrivateKey(EthUtil.toBuffer('0x3bcd178668a0155de78fe75f23df20b021fb50bfa1a488f7bb10316bdc8b69a6', 'hex'));
user4 = Wallet.fromPrivateKey(EthUtil.toBuffer('0x15ef4d2df2121930b968eec278b25134e2851d82f752958a5460a78b47617ac1', 'hex'));

contract("SecureConf", ([manager]) => {

 	 beforeEach('initialize contracts', async () => {
		//this.mConf = await new web3.eth.Contract(bcmc.abi, contractAccount);
		mConf = await SecureConf.new({ from: manager });
		await web3.eth.sendTransaction({from: manager, to: user1.getAddressString(), value: web3.utils.toWei("1", "ether")})
        await web3.eth.sendTransaction({from: manager, to: user2.getAddressString(), value: web3.utils.toWei("1", "ether")})
        await web3.eth.sendTransaction({from: manager, to: user3.getAddressString(), value: web3.utils.toWei("1", "ether")})
        await web3.eth.sendTransaction({from: manager, to: user4.getAddressString(), value: web3.utils.toWei("1", "ether")})
	 });
   
	describe("conf", async () => {
		it('should be deployed correctly', async () => {
      			assert.notEqual(mConf, null, "conf not deployed");
   		});
		
		it("Register Conference", async () => {
			res = await registerConference(mConf, user1, user1);
		});
		 
		it("Register Participant", async () => {
	   		await registerParticipant(mConf, user1);
		});
		

   		it("Conference Key Distribution", async () => {
			var drmToken = '{"org.w3.clearkey": {"clearkeys": {"nrQFDeRLSAKTLifXUIPiZg": "FmY0xnWCPCNaSpRG-tUuTQ"}}}';
	   		await registerParticipant(mConf, user1);
			await registerParticipant(mConf, user2);
	   		await registerParticipant(mConf, user3);
			await registerParticipant(mConf, user4);
			res = await registerConference(mConf, user1, user1);
			//console.log(res);
			var confId = 0; // TODO
			res = await purchaseConference(mConf, confId, user1);
			res = await purchaseConference(mConf, confId, user2);
			res = await purchaseConference(mConf, confId, user3);
			res = await purchaseConference(mConf, confId, user4);

			res = await grantViewToken(mConf, user1, confId, user1,  drmToken);
			res = await grantViewToken(mConf, user1, confId, user2,  drmToken);
			res = await grantViewToken(mConf, user1, confId, user3,  drmToken);
			res = await grantViewToken(mConf, user1, confId, user4,  drmToken);

			drmToken1 = await getDrmToken(mConf, confId, user1);
			console.log(drmToken1);

			drmToken2 = await getDrmToken(mConf, confId, user2);
			console.log(drmToken2);

			drmToken3 = await getDrmToken(mConf, confId, user3);
			console.log(drmToken3);
			drmToken4 = await getDrmToken(mConf, confId, user4);
			console.log(drmToken4);			

	 	});
	});
});
