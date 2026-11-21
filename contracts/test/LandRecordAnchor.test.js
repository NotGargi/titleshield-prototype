const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRecordAnchor Contract", function () {
  let landRecordAnchor;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const LandRecordAnchorFactory = await ethers.getContractFactory("LandRecordAnchor");
    landRecordAnchor = await LandRecordAnchorFactory.deploy();
    await landRecordAnchor.waitForDeployment();
  });

  it("Should anchor a new land record successfully", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("MOCK_7_12_MAHARASHTRA_SURVEY_104_A"));
    const stateCode = "MH";
    const docType = "7_12";
    const surveyNumber = "104/A";
    const district = "Pune";
    const ipfsCID = "QmZtmD2qt8S5vHMBrjzbqn36NNubMmHub5R2FvGLnZRPZw";

    const tx = await landRecordAnchor.anchorRecord(
      docHash,
      stateCode,
      docType,
      surveyNumber,
      district,
      ipfsCID
    );
    await tx.wait();

    const [isVerified, record] = await landRecordAnchor.verifyRecord(docHash);
    expect(isVerified).to.be.true;
    expect(record.stateCode).to.equal("MH");
    expect(record.surveyNumber).to.equal("104/A");
    expect(record.district).to.equal("Pune");
    expect(record.anchoredBy).to.equal(owner.address);
    expect(record.ipfsCID).to.equal(ipfsCID);
  });

  it("Should prevent duplicate anchoring of the same document hash", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("DUPLICATE_TEST_HASH"));

    await landRecordAnchor.anchorRecord(
      docHash,
      "TG",
      "EC",
      "88/2",
      "Ranga Reddy",
      ""
    );

    await expect(
      landRecordAnchor.anchorRecord(
        docHash,
        "TG",
        "EC",
        "88/2",
        "Ranga Reddy",
        ""
      )
    ).to.be.revertedWithCustomError(landRecordAnchor, "RecordAlreadyAnchored");
  });

  it("Should correctly track total count and list of anchored records", async function () {
    const hash1 = ethers.keccak256(ethers.toUtf8Bytes("RECORD_1"));
    const hash2 = ethers.keccak256(ethers.toUtf8Bytes("RECORD_2"));

    await landRecordAnchor.anchorRecord(hash1, "KA", "RTC", "45", "Bengaluru Urban", "");
    await landRecordAnchor.anchorRecord(hash2, "GJ", "7_12", "12", "Ahmedabad", "");

    const total = await landRecordAnchor.totalAnchoredRecords();
    expect(total).to.equal(2n);

    const hashes = await landRecordAnchor.getAnchoredHashes(0, 10);
    expect(hashes.length).to.equal(2);
    expect(hashes[0]).to.equal(hash1);
    expect(hashes[1]).to.equal(hash2);
  });
});
