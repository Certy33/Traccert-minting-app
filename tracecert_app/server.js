const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { ThirdwebSDK } = require("@thirdweb-dev/sdk");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

// Serve static files from the public directory for the form UI
app.use(express.static('public'));

// initialize SDK using your private key and network
const sdk = ThirdwebSDK.fromPrivateKey(
  process.env.PRIVATE_KEY,
  "polygon",
  { secretKey: process.env.THIRDWEB_SECRET_KEY }
);

// healthcheck route
app.get("/", (req, res) => {
  res.send("TraceCert API is live and listening for POST requests at /mint");
});

// mint route
app.post("/mint", upload.single("file"), async (req, res) => {
  try {
    const { address, contractor, date, type } = req.body;
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = req.file.originalname;

    // get contract instance
    const contract = await sdk.getContract(process.env.CONTRACT_ADDRESS);
    const { storage } = sdk;

    // upload file to IPFS and get URI
    const uri = await storage.upload(fileBuffer, { uploadWithGatewayUrl: true });
    const cid = uri.split("/")[2];

    const metadata = {
      name: `TraceCert - ${fileName}`,
      description: "Certified housing document stored securely on-chain.",
      image: uri,
      properties: {
        originalFilename: fileName,
        propertyAddress: address,
        contractor,
        completionDate: date,
        certificateType: type,
      },
    };

    const tx = await contract.erc721.mint(metadata);

    res.json({
      status: "success",
      tokenId: tx.id.toString(),
      ipfs: `https://ipfs.io/ipfs/${cid}/${fileName}`,
      opensea: `https://opensea.io/assets/matic/${process.env.CONTRACT_ADDRESS}/${tx.id}`,
      txHash: tx.receipt.transactionHash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TraceCert API running at http://localhost:${PORT}`);
});
