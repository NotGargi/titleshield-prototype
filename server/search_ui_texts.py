import re

bundle_path = r'C:\kiddo\landeed-decompiled\com.landeed\resources\assets\index.android.bundle'
with open(bundle_path, 'rb') as f:
    data = f.read()

# Search for home screen layout texts
# For instance, titles, subheadings, labels displayed on the home screen
texts = [
    b'Search any land record',
    b'Search by Survey',
    b'Select State',
    b'Popular Searches',
    b'Trending in',
    b'Explore by State',
    b'Property Locker',
    b'Terra',
    b'Survey Explorer',
    b'All Documents',
    b'Instant 7/12',
    b'Instant EC',
    b'Instant RTC',
]

for t in texts:
    p = data.find(t)
    if p != -1:
        chunk = data[max(0, p-100):min(len(data), p+200)]
        print(f"=== Found '{t.decode('utf-8')}' at {p} ===")
        print(chunk.decode('utf-8', errors='ignore'))
        print()
