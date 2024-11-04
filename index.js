const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const {
  Keypair,
  BASE_FEE,
  TransactionBuilder,
  Aurora,
  Networks,
  Operation,
  Asset,
} = require("diamnet-sdk");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

//serverw allet
//
// app.post("/createAsset", async (req, res) => {
//   var { userAddress, assetName, metadata } = req.body;

//   console.log("Received data:", { userAddress, assetName, metadata });


//   const serverWallet = Keypair.fromSecret(
//     "SAAW2UGWLV2SOP2GULMDXK4NTHQT3JXUNFYAKFRMRPR2DA7A4QY5VMWK" //fetch it from server storage
//   );

//   const intermediaryWallet = Keypair.random();

//   if (!userAddress || !assetName || !metadata) {
//     return res
//       .status(400)
//       .json({ error: "userAddress, assetName, and metadata are required" });
//   }

//   const server = new Aurora.Server("https://diamtestnet.diamcircle.io/");

//   const kycAsset = new Asset(assetName, intermediaryWallet.publicKey());

//   const masterAccount = await server.loadAccount(serverWallet.publicKey());

//   const numOperations = 6;
//   const totalFee = ((BASE_FEE * numOperations) / Math.pow(10, 7)).toString();

//   const tx = new TransactionBuilder(masterAccount, {
//     fee: BASE_FEE,
//     networkPassphrase: Networks.TESTNET, // Ensure the network passphrase is set
//   })
//     .addOperation(
//       Operation.payment({
//         destination: serverWallet.publicKey(),
//         asset: Asset.native(),
//         amount: totalFee,
//         source: userAddress,
//       })
//     )
//     .addOperation(
//       Operation.createAccount({
//         destination: intermediaryWallet.publicKey(),
//         startingBalance: "0.000001",
//         source: serverWallet.publicKey(),
//       })
//     )
//     .addOperation(
//       Operation.changeTrust({
//         asset: kycAsset,
//         source: userAddress,
//       })
//     )
//     .addOperation(
//       Operation.manageData({
//         name: assetName,
//         source: intermediaryWallet.publicKey(),
//         value: "ipfs-cid",
//       })
//     )
//     .addOperation(
//       Operation.payment({
//         destination: userAddress,
//         source: intermediaryWallet.publicKey(),
//         asset: kycAsset,
//         amount: "0.0000001",
//       })
//     )
//     .addOperation(
//       Operation.setOptions({
//         source: intermediaryWallet.publicKey(),
//         masterWeight: 0,
//       })
//     )
//     .setTimeout(0)
//     .build();

//   tx.sign(serverWallet, intermediaryWallet); //userAddress

//   const xdr = tx.toXDR();

//   res.status(200).json({
//     message: "Asset creation request received",
//     xdr: xdr,
//   });

// });



app.post('/masterAccount', async (req, res) => {
  console.log('inside masterAccount Api')
  const userWalletAddress = req.body.walletAddress
  const masterWalletK = Keypair.random()
  const server = new Aurora.Server("https://diamtestnet.diamcircle.io/");
  const userAccount = await server.loadAccount(userWalletAddress);
  const tx = new TransactionBuilder(userAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.createAccount({
        destination: masterWalletK.publicKey(),
        startingBalance: "0.10000",
        source: userWalletAddress, // The server wallet funds the account creation.
      })
    )
    .setTimeout(0).build();
  const xdr = tx.toXDR();
  res.status(200).json({
    message: "Asset creation request received",
    xdr: xdr, // Return the XDR of the transaction for further submission.
    walletAddress: masterWalletK.publicKey(),
    pubKey: masterWalletK.secret()
  });
})
// This is an API route that listens for POST requests to "/createAsset".
// The route is used to create an asset on the DiamCircle blockchain and associate metadata with it.
app.post("/createAsset", async (req, res) => {
  
  // Extract userAddress, assetName, and metadata from the incoming request body.
  var { userAddress, assetName, metadata, serverPubKey } = req.body;

  // Log the received data to the console for debugging purposes.
  console.log("Received data:", { userAddress, assetName, metadata, serverPubKey });

  // Server wallet (main account) is fetched from server-side storage (in this case, hard-coded for simplicity).
  let serverWallet = Keypair.fromSecret(
    serverPubKey
  );
  // Create a new intermediary wallet (a temporary keypair for the asset creation process).
  const intermediaryWallet = Keypair.random();

  // Validate that required fields (userAddress, assetName, metadata) are provided in the request body.
  if (!userAddress || !assetName || !metadata) {
    // If any of these fields are missing, return a 400 Bad Request error response.
    return res
      .status(400)
      .json({ error: "userAddress, assetName, and metadata are required" });
  }

  // Connect to the DiamCircle testnet using Aurora SDK.
  const server = new Aurora.Server("https://diamtestnet.diamcircle.io/");

  // Define the asset to be created, using the asset name and the intermediary wallet's public key as the issuer.
  const kycAsset = new Asset(assetName, intermediaryWallet.publicKey());

  // Load the current state of the server wallet account from the blockchain.
  const masterAccount = await server.loadAccount(serverWallet.publicKey());

  // Define the number of operations in the transaction.
  const numOperations = 6;

  // Calculate the total fee for the transaction based on the number of operations.
  const totalFee = ((BASE_FEE * numOperations) / Math.pow(10, 7))

  console.log(totalFee, 0.1, totalFee + 0.1)

  // Create a new transaction builder with the loaded account (serverWallet) and a fee.
  const tx = new TransactionBuilder(masterAccount, {
    fee: BASE_FEE, // BASE_FEE is the fee for each operation.
    networkPassphrase: Networks.TESTNET, //network passphrase 
  })
    // First operation: The user sends a payment to cover the transaction fees to server wallet.
    .addOperation(
      Operation.payment({
        destination: serverWallet.publicKey(), // The server wallet receives the fee from the user.
        asset: Asset.native(), // Native asset DIAM.
        amount: totalFee.toString() , // Amount calculated above to cover the fee.
        source: userAddress, // The user's account is the source of the payment.
      })
    )
    // Second operation: Server wallet create an intermediary account with a small starting balance.
    .addOperation(
      Operation.createAccount({
        destination: intermediaryWallet.publicKey(), // Create the intermediary account.
        startingBalance: "0.000001", // The sufficient starting balance required by the blockchain.
        source: serverWallet.publicKey(), // The server wallet funds the account creation.
      })
    )
    // Third operation: The user creates a trustline for the new asset, allowing them to hold the asset.
    .addOperation(
      Operation.changeTrust({
        asset: kycAsset, // The asset that the user will trust.
        source: userAddress, // The user's account creates the trustline.
      })
    )
    // Fourth operation: Store the metadata for the asset under the intermediary account.
    .addOperation(
      Operation.manageData({
        name: assetName, // Name of the data entry (typically the asset name).
        source: intermediaryWallet.publicKey(), // Data is stored under the intermediary wallet.
        value: "Encrypted data", // The metadata value (e.g., CID from IPFS).
      })
    )
    // Fifth operation: Transfer a minimal amount of the new asset to the user.
    .addOperation(
      Operation.payment({
        destination: userAddress, // The user's account receives the new asset.
        source: intermediaryWallet.publicKey(), // The intermediary wallet is the issuer/source.
        asset: kycAsset, // The newly created asset.
        amount: "0.0000001", // Minimal amount of the asset to be transferred.
      })
    )
    // Sixth operation: Disable the intermediary account's master key to prevent further changes.
    .addOperation(
      Operation.setOptions({
        source: intermediaryWallet.publicKey(), // Intermediary account.
        masterWeight: 0, // Disable the master key by setting weight to 0 (no control).
      })
    )
    // Set the transaction timeout to 0, meaning it will never expire.
    .setTimeout(0)
    // Build the transaction.
    .build();

  // Sign the transaction with both the server wallet and the intermediary wallet.
  tx.sign(serverWallet, intermediaryWallet);

  // Convert the transaction to XDR (a standard representation format for transactions).
  const xdr = tx.toXDR();

  // Return a successful response with the XDR representation of the transaction.
  res.status(200).json({
    message: "Asset creation request received",
    xdr: xdr, // Return the XDR of the transaction for further submission.
  });

});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
