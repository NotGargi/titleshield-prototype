import re

bundle_path = r'C:\kiddo\landeed-decompiled\com.landeed\resources\assets\index.android.bundle'
with open(bundle_path, 'rb') as f:
    data = f.read()

# Find strings surrounding createBottomTabNavigator
pos = data.find(b'createBottomTabNavigator')
if pos != -1:
    print("createBottomTabNavigator found at:", pos)
    chunk = data[pos-1000:pos+3000]
    # find all readable strings
    readable = re.findall(rb'[A-Za-z0-9_ -]{3,}', chunk)
    print("Surrounding words:", [w.decode('utf-8', errors='ignore') for w in readable if len(w) > 3][:60])

# Search for the tab navigator routes
# Landeed has tabs like: Home, Survey / Map, Terra, Locker, Orders / Profile
tabs = []
for pattern in [b'HomeTab', b'SurveyTab', b'TerraTab', b'LockerTab', b'OrdersTab', b'SearchTab', b'ExploreTab']:
    p = data.find(pattern)
    if p != -1:
        tabs.append((pattern.decode('utf-8'), p))
print("Known tab patterns:", tabs)

# Let's search for "Terra" features
terra_strings = set(re.findall(rb'Terra[A-Z][a-zA-Z0-9]+', data))
print("\n--- Terra features (first 30) ---")
print([t.decode('utf-8') for t in sorted(list(terra_strings))[:30]])

# Let's search for Home Screen components and sections
home_sections = set(re.findall(rb'([A-Za-z0-9]+(?:Header|Section|Row|Grid|Carousel|Banner|Card|Search)[A-Za-z0-9]*)', data))
landeed_home = [s.decode('utf-8') for s in home_sections if any(k in s.decode('utf-8').lower() for k in ['home', 'state', 'service', 'popular', 'recent', 'terra', 'survey', 'locker'])]
print("\n--- Home Screen Sections ---")
print(sorted(list(set(landeed_home)))[:50])
