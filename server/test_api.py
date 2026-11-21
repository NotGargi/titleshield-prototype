import urllib.request
import json

# 1. Test Health
req = urllib.request.Request('http://localhost:4000/api/health')
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print('1. Health check response:', data)

# 2. Test States
req = urllib.request.Request('http://localhost:4000/api/states')
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print(f"2. Supported states count: {len(data['states'])}")
    for s in data['states']:
        print(f"   • {s['code']} ({s['name']}): {[d['name'] for d in s['documents']]}")

# 3. Test Fetching a Record (TinyFish agent + Blockchain Anchor)
payload = json.dumps({
    'state': 'MH',
    'docType': '7_12',
    'district': 'Pune',
    'taluka': 'Haveli',
    'village': 'Wagholi',
    'surveyNo': '142/2A',
    'khataNo': 'KH-8821',
    'ownerName': 'Vikramaditya Shinde'
}).encode('utf-8')

req = urllib.request.Request(
    'http://localhost:4000/api/records/fetch',
    data=payload,
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as resp:
    record = json.loads(resp.read().decode('utf-8'))
    print('\n3. Record Fetch & Anchor Success!')
    print(f"   Record ID: {record['recordId']}")
    print(f"   Title: {record['title']}")
    print(f"   Document SHA-256 Hash: {record['proof']['docHash']}")
    print(f"   On-chain Tx Hash: {record['proof']['transactionHash']}")
    print(f"   Block Number: {record['proof']['blockNumber']}")
    print(f"   Explorer URL: {record['proof']['explorerUrl']}")
    print(f"   Verification URL: {record['verificationUrl']}")
    print(f"   TinyFish steps count: {len(record['steps'])}")

# 4. Test Verification endpoint
doc_hash = record['proof']['docHash']
req = urllib.request.Request(f'http://localhost:4000/api/verify/{doc_hash}?format=json')
with urllib.request.urlopen(req) as resp:
    verify_data = json.loads(resp.read().decode('utf-8'))
    print('\n4. Verification Audit Endpoint:')
    print(f"   Verified: {verify_data['verified']}")
    print(f"   Network: {verify_data['network']}")
    print(f"   Smart Contract: {verify_data['contract']}")
    print(f"   Matched Jurisdiction: {verify_data['matchedRecord']}")

# 5. Test PDF Download endpoint
req = urllib.request.Request(f"http://localhost:4000/api/records/{record['recordId']}/download")
with urllib.request.urlopen(req) as resp:
    pdf_bytes = resp.read()
    print(f"\n5. Certified PDF Download: {len(pdf_bytes)} bytes received (PDF Header: {pdf_bytes[:4]})")
