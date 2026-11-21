// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LandRecordAnchor
 * @notice Cryptographically anchors government land registry records (7/12, EC, RTC, Mutation)
 *         onto the blockchain for tamper-evident public verification.
 */
contract LandRecordAnchor {
    struct Record {
        bytes32 docHash;        // SHA-256 hash of the generated / extracted official document
        string stateCode;      // e.g., "MH" (Maharashtra), "TG" (Telangana), "KA" (Karnataka)
        string docType;        // e.g., "7_12", "EC", "RTC", "MUTATION", "PATTA"
        string surveyNumber;   // Survey / Khasra / Khata / Door number
        string district;       // Administrative district
        uint256 blockTimestamp;// Unix timestamp of blockchain block
        address anchoredBy;    // Submitting entity / relayer address
        string ipfsCID;        // Decentralized IPFS CID / Arweave hash (if backed up)
        bool exists;           // Flag indicating existence
    }

    // Mapping from Document SHA-256 Hash to On-Chain Record Details
    mapping(bytes32 => Record) private _records;

    // Array of all anchored document hashes for public auditing
    bytes32[] private _allDocHashes;

    // Events
    event DocumentAnchored(
        bytes32 indexed docHash,
        string indexed stateCode,
        string docType,
        string surveyNumber,
        string district,
        uint256 blockTimestamp,
        address indexed anchoredBy
    );

    error RecordAlreadyAnchored(bytes32 docHash, uint256 existingTimestamp);
    error InvalidDocHash();

    /**
     * @notice Anchor a newly fetched government land record.
     * @param docHash The SHA-256 hash of the document.
     * @param stateCode State code (e.g., "MH", "TG", "KA").
     * @param docType Type of document (e.g., "7_12", "EC", "RTC").
     * @param surveyNumber Survey or Khasra identification number.
     * @param district District name.
     * @param ipfsCID Optional IPFS CID for decentralized storage.
     */
    function anchorRecord(
        bytes32 docHash,
        string calldata stateCode,
        string calldata docType,
        string calldata surveyNumber,
        string calldata district,
        string calldata ipfsCID
    ) external returns (bool) {
        if (docHash == bytes32(0)) revert InvalidDocHash();
        if (_records[docHash].exists) {
            revert RecordAlreadyAnchored(docHash, _records[docHash].blockTimestamp);
        }

        Record memory newRecord = Record({
            docHash: docHash,
            stateCode: stateCode,
            docType: docType,
            surveyNumber: surveyNumber,
            district: district,
            blockTimestamp: block.timestamp,
            anchoredBy: msg.sender,
            ipfsCID: ipfsCID,
            exists: true
        });

        _records[docHash] = newRecord;
        _allDocHashes.push(docHash);

        emit DocumentAnchored(
            docHash,
            stateCode,
            docType,
            surveyNumber,
            district,
            block.timestamp,
            msg.sender
        );

        return true;
    }

    /**
     * @notice Verify whether a document hash exists on-chain and retrieve its verified details.
     * @param docHash The SHA-256 hash to verify.
     */
    function verifyRecord(bytes32 docHash)
        external
        view
        returns (bool isVerified, Record memory record)
    {
        Record memory r = _records[docHash];
        return (r.exists, r);
    }

    /**
     * @notice Returns total number of anchored land records.
     */
    function totalAnchoredRecords() external view returns (uint256) {
        return _allDocHashes.length;
    }

    /**
     * @notice Get list of all anchored document hashes.
     */
    function getAnchoredHashes(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory)
    {
        uint256 total = _allDocHashes.length;
        if (offset >= total) return new bytes32[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        uint256 size = end - offset;
        bytes32[] memory result = new bytes32[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = _allDocHashes[offset + i];
        }
        return result;
    }
}
