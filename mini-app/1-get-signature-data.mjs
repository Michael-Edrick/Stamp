import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

// Configure dotenv to look for the .env file in the current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function getSignatureData() {
  const apiKey = process.env.NEYNAR_API_KEY;
  const appFid = process.env.FARCASTER_BOT_FID;

  if (!apiKey || !appFid) {
    console.error("Error: NEYNAR_API_KEY or FARCASTER_BOT_FID is not set in your .env file.");
    return;
  }

  try {
    console.log("Step 1: Creating a new signer...");
    const createSignerResponse = await fetch('https://api.neynar.com/v2/farcaster/signer', {
      method: 'POST',
      headers: { 'api_key': apiKey, 'Content-Type': 'application/json' },
    });
    const signerData = await createSignerResponse.json();
    if (!createSignerResponse.ok) throw new Error(`Failed to create signer: ${JSON.stringify(signerData)}`);
    
    const { signer_uuid, public_key } = signerData;
    console.log(`   ✅ New signer created.`);
    
    const deadline = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now

    const eip712Definition = {
      domain: {
        name: "Farcaster SignedKeyRequestValidator",
        version: "1",
        chainId: 10, // OP Mainnet
        verifyingContract: "0x00000000fc700472606ed4fa22623acf62466d23",
      },
      types: {
        SignedKeyRequest: [
          { name: "requestFid", type: "uint256" },
          { name: "key", type: "bytes" },
          { name: "deadline", type: "uint256" },
        ],
      },
      primaryType: 'SignedKeyRequest',
      message: {
        requestFid: appFid,
        key: public_key,
        deadline: deadline.toString(),
      },
    };

    console.log("\n------------------------------------------------------------------");
    console.log("✅ STEP 1 COMPLETE ✅");
    console.log("------------------------------------------------------------------");
    console.log("\nACTION REQUIRED FOR STEP 2:");
    console.log("\n1. SAVE THIS SIGNER UUID for the next script:");
    console.log(`   => ${signer_uuid}`);
    
    console.log("\n2. SAVE THIS DEADLINE for the next script:");
    console.log(`   => ${deadline}`);

    console.log("\n3. GO TO a trusted EIP-712 signing tool (like Etherscan's: https://etherscan.io/verifiedSignatures#)");
    console.log("   Connect the wallet that is the CUSTODY ADDRESS for FID", appFid);
    
    console.log("\n4. COPY AND PASTE THE ENTIRE JSON BLOB BELOW into the signing tool:");
    console.log("   (Make sure to copy everything from the opening { to the closing })");
    console.log("\n👇👇👇\n");

    console.log(JSON.stringify(eip712Definition, null, 2));

    console.log("\n\n5. After signing, you will get a signature string. Save it for the next script.");
    console.log("------------------------------------------------------------------");


  } catch (error) {
    console.error("\n❌ An error occurred:", error);
  }
}

getSignatureData();
