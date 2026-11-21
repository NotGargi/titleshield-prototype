import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  ActivityIndicator
} from 'react-native';
import Svg, { Polygon, Text as SvgText, Circle, G } from 'react-native-svg';
import {
  Layers,
  MapPin,
  Locate,
  Plus,
  Minus,
  Compass,
  CheckCircle2,
  Navigation,
  Globe2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react-native';
import {
  GeoPoint,
  geoToPixel,
  pixelToGeo,
  getVisibleTiles,
  TileProviderType,
  getStateWmsConfig,
  StateWmsConfig
} from '../utils/geoProjection';
import {
  CadastralParcel,
  SEEDED_CADASTRAL_PARCELS,
  REGIONAL_PRESETS,
  RegionalPreset
} from '../constants/cadastralData';
import { API_BASE_URL } from '../constants/api';

function computeNewCenterPreservingFocalPoint(
  focalX: number,
  focalY: number,
  oldZoom: number,
  newZoom: number,
  oldCenter: GeoPoint,
  width: number,
  height: number
): GeoPoint {
  const geoUnderFocal = pixelToGeo(
    focalX,
    focalY,
    oldZoom,
    oldCenter.lat,
    oldCenter.lng,
    width,
    height
  );

  return pixelToGeo(
    width - focalX,
    height - focalY,
    newZoom,
    geoUnderFocal.lat,
    geoUnderFocal.lng,
    width,
    height
  );
}

export interface CadastralMapProps {
  selectedParcel: CadastralParcel | null;
  onSelectParcel: (parcel: CadastralParcel) => void;
  height?: number;
  centerCoords?: GeoPoint | null;
  zoomLevel?: number;
}

export function CadastralMap({
  selectedParcel,
  onSelectParcel,
  height = 420,
  centerCoords,
  zoomLevel
}: CadastralMapProps) {
  const windowWidth = Dimensions.get('window').width;
  const canvasHeight = height;
  const [mapDimensions, setMapDimensions] = useState({
    width: Math.min(windowWidth, 900),
    height: canvasHeight
  });

  const [activeLayer, setActiveLayer] = useState<'satellite' | 'cadastral' | 'wms'>('satellite');
  const [activeRegionId, setActiveRegionId] = useState<string>('mh-pune-wagholi');
  const [wmsTileErrors, setWmsTileErrors] = useState<Record<string, boolean>>({});
  const [isWmsOverlayActive, setIsWmsOverlayActive] = useState<boolean>(true);
  const [parcels, setParcels] = useState<CadastralParcel[]>(SEEDED_CADASTRAL_PARCELS);
  const [isLoadingParcels, setIsLoadingParcels] = useState<boolean>(false);

  const initialRegion = REGIONAL_PRESETS[0];
  const [mapCenter, setMapCenter] = useState<GeoPoint>(initialRegion.coordinates);
  const [zoom, setZoom] = useState<number>(initialRegion.zoom);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Stable refs for smooth gesture tracking & wheel/pinch ergonomics
  const canvasWrapperRef = useRef<View>(null);
  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;
  const mapCenterRef = useRef<GeoPoint>(mapCenter);
  mapCenterRef.current = mapCenter;
  const gestureStartCenterRef = useRef<GeoPoint>(mapCenter);

  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(zoom);
  const pinchStartMidRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartCenterRef = useRef<GeoPoint>(mapCenter);

  // External camera flight synchronization
  useEffect(() => {
    if (centerCoords && (centerCoords.lat !== mapCenter.lat || centerCoords.lng !== mapCenter.lng)) {
      setMapCenter(centerCoords);
    }
  }, [centerCoords?.lat, centerCoords?.lng]);

  useEffect(() => {
    if (typeof zoomLevel === 'number' && zoomLevel !== zoom) {
      setZoom(zoomLevel);
    }
  }, [zoomLevel]);

  useEffect(() => {
    if (selectedParcel?.coordinates) {
      setMapCenter(selectedParcel.coordinates);
      setZoom((prev) => (prev < 16 ? 16 : prev));
    }
  }, [selectedParcel?.id]);

  // Combined parcels list guaranteeing selectedParcel is always displayed
  const displayParcels = useMemo(() => {
    if (!selectedParcel) return parcels;
    const exists = parcels.some((p) => p.id === selectedParcel.id);
    return exists ? parcels : [selectedParcel, ...parcels];
  }, [parcels, selectedParcel]);

  // Active regional preset and jurisdiction state
  const currentPreset = useMemo(
    () => REGIONAL_PRESETS.find((p) => p.id === activeRegionId) || REGIONAL_PRESETS[0],
    [activeRegionId]
  );

  const activeStateCode = selectedParcel?.state || currentPreset.state || 'MH';
  const activeWmsConfig: StateWmsConfig = useMemo(
    () => getStateWmsConfig(activeStateCode),
    [activeStateCode]
  );

  // Dynamic parcel loader hook fetching from backend with graceful fallback to SEEDED_CADASTRAL_PARCELS
  useEffect(() => {
    let isMounted = true;
    const fetchParcels = async () => {
      try {
        setIsLoadingParcels(true);
        const topLeft = pixelToGeo(0, 0, zoom, mapCenter.lat, mapCenter.lng, mapDimensions.width, mapDimensions.height);
        const bottomRight = pixelToGeo(mapDimensions.width, mapDimensions.height, zoom, mapCenter.lat, mapCenter.lng, mapDimensions.width, mapDimensions.height);
        const minLat = Math.min(topLeft.lat, bottomRight.lat);
        const maxLat = Math.max(topLeft.lat, bottomRight.lat);
        const minLng = Math.min(topLeft.lng, bottomRight.lng);
        const maxLng = Math.max(topLeft.lng, bottomRight.lng);
        const bboxStr = `${minLng.toFixed(6)},${minLat.toFixed(6)},${maxLng.toFixed(6)},${maxLat.toFixed(6)}`;

        const url = `${API_BASE_URL}/cadastre/parcels?bbox=${encodeURIComponent(bboxStr)}&state=${encodeURIComponent(activeStateCode)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.parcels) ? data.parcels : (Array.isArray(data) ? data : []);
          if (isMounted && list.length > 0) {
            setParcels(list);
            return;
          }
        }
        if (isMounted) {
          setParcels(SEEDED_CADASTRAL_PARCELS);
        }
      } catch (_err) {
        if (isMounted) {
          setParcels(SEEDED_CADASTRAL_PARCELS);
        }
      } finally {
        if (isMounted) {
          setIsLoadingParcels(false);
        }
      }
    };

    fetchParcels();

    return () => {
      isMounted = false;
    };
  }, [mapCenter.lat, mapCenter.lng, zoom, mapDimensions.width, mapDimensions.height, activeStateCode]);

  // PanResponder for smooth click-and-drag panning and mobile pinch-to-zoom
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          return (
            (e.nativeEvent.touches && e.nativeEvent.touches.length === 2) ||
            Math.abs(gestureState.dx) > 4 ||
            Math.abs(gestureState.dy) > 4
          );
        },
        onPanResponderGrant: () => {
          gestureStartCenterRef.current = mapCenterRef.current;
          pinchStartDistRef.current = null;
          pinchStartMidRef.current = null;
        },
        onPanResponderMove: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const touches = e.nativeEvent.touches;
          if (touches && touches.length === 2) {
            // Multi-touch pinch-to-zoom
            const t1 = touches[0];
            const t2 = touches[1];
            const dist = Math.sqrt(
              Math.pow(t2.pageX - t1.pageX, 2) + Math.pow(t2.pageY - t1.pageY, 2)
            );
            const midX = (t1.locationX + t2.locationX) / 2;
            const midY = (t1.locationY + t2.locationY) / 2;

            if (pinchStartDistRef.current === null) {
              pinchStartDistRef.current = dist;
              pinchStartZoomRef.current = zoomRef.current;
              pinchStartCenterRef.current = mapCenterRef.current;
              pinchStartMidRef.current = { x: midX, y: midY };
              return;
            }

            const scale = dist / pinchStartDistRef.current;
            const zoomDelta = Math.log2(scale);
            const targetZoom = Math.min(19, Math.max(12, pinchStartZoomRef.current + zoomDelta));

            const newCenter = computeNewCenterPreservingFocalPoint(
              pinchStartMidRef.current?.x || mapDimensions.width / 2,
              pinchStartMidRef.current?.y || mapDimensions.height / 2,
              pinchStartZoomRef.current,
              targetZoom,
              pinchStartCenterRef.current,
              mapDimensions.width,
              mapDimensions.height
            );

            setZoom(Math.round(targetZoom * 10) / 10);
            setMapCenter(newCenter);
          } else if (!touches || touches.length <= 1) {
            // Single-finger drag / pan
            pinchStartDistRef.current = null;
            pinchStartMidRef.current = null;

            const startCenter = gestureStartCenterRef.current;
            const newCenter = pixelToGeo(
              mapDimensions.width / 2 - gestureState.dx,
              mapDimensions.height / 2 - gestureState.dy,
              zoomRef.current,
              startCenter.lat,
              startCenter.lng,
              mapDimensions.width,
              mapDimensions.height
            );
            setMapCenter(newCenter);
          }
        },
        onPanResponderRelease: () => {
          pinchStartDistRef.current = null;
          pinchStartMidRef.current = null;
        },
        onPanResponderTerminate: () => {
          pinchStartDistRef.current = null;
          pinchStartMidRef.current = null;
        }
      }),
    [mapDimensions.width, mapDimensions.height]
  );

  // Web desktop mouse scroll-wheel zoom with focal centroid preservation
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const el = canvasWrapperRef.current as unknown as HTMLElement;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentZ = zoomRef.current;
      const delta = e.deltaY < 0 ? 0.5 : -0.5;
      const nextZ = Math.min(19, Math.max(12, Math.round((currentZ + delta) * 2) / 2));
      if (nextZ === currentZ) return;

      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const newCenter = computeNewCenterPreservingFocalPoint(
        cursorX,
        cursorY,
        currentZ,
        nextZ,
        mapCenterRef.current,
        mapDimensions.width,
        mapDimensions.height
      );

      setZoom(nextZ);
      setMapCenter(newCenter);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [mapDimensions.width, mapDimensions.height]);

  // Visible tiles calculation with state WMS BhuNaksha parameters
  const visibleTiles = useMemo(() => {
    return getVisibleTiles(
      mapCenter.lat,
      mapCenter.lng,
      zoom,
      mapDimensions.width,
      mapDimensions.height,
      activeStateCode
    );
  }, [mapCenter, zoom, mapDimensions, activeStateCode]);

  // Resilient silent tile error recovery on image load failure
  const handleWmsTileError = (tileKey: string) => {
    setWmsTileErrors((prev) => ({ ...prev, [tileKey]: true }));
  };

  // GPS Geolocation Handler
  const handleGpsLocate = () => {
    setIsLocating(true);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({ lat: latitude, lng: longitude });
          setZoom(17);
          setIsLocating(false);
        },
        (error) => {
          console.warn('Geolocation warning (using regional centroid fallback):', error.message);
          setMapCenter(currentPreset.coordinates);
          setZoom(currentPreset.zoom);
          setIsLocating(false);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      setMapCenter(currentPreset.coordinates);
      setZoom(currentPreset.zoom);
      setIsLocating(false);
    }
  };

  // Region Preset Selector Handler
  const handleSelectRegion = (preset: RegionalPreset) => {
    setActiveRegionId(preset.id);
    setMapCenter(preset.coordinates);
    setZoom(preset.zoom);

    const targetParcel =
      displayParcels.find((p) => p.id === preset.defaultParcelId) ||
      SEEDED_CADASTRAL_PARCELS.find((p) => p.id === preset.defaultParcelId);
    if (targetParcel) {
      onSelectParcel(targetParcel);
    }
  };

  const isWmsZoomEligible = zoom >= activeWmsConfig.minZoom;
  const shouldRenderWmsTiles =
    (activeLayer === 'wms' || isWmsOverlayActive) && isWmsZoomEligible;

  return (
    <View
      style={styles.container}
      testID="cadastral-map-viewer"
      {...(Platform.OS === 'web' ? { 'data-testid': 'cadastral-map-viewer' } : {})}
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        if (width > 0 && Math.abs(width - mapDimensions.width) > 5) {
          setMapDimensions((prev) => ({ ...prev, width }));
        }
      }}
    >
      {/* Top Map Toolbar */}
      <View style={styles.topToolbar}>
        {/* Jurisdiction title pill */}
        <View style={styles.jurisdictionPill}>
          <Compass size={14} color="#0284c7" />
          <Text style={styles.jurisdictionText} numberOfLines={1}>
            {selectedParcel
              ? `${selectedParcel.village}, ${selectedParcel.district} (${selectedParcel.state})`
              : `${currentPreset.village}, ${currentPreset.district} (${currentPreset.state})`}
          </Text>
        </View>

        {/* Real-time State WMS Status Pill Indicator */}
        <View
          style={[
            styles.wmsLiveBadge,
            isWmsZoomEligible ? styles.wmsLiveBadgeActive : styles.wmsLiveBadgeInactive
          ]}
          testID="wms-status-pill"
          {...(Platform.OS === 'web' ? { 'data-testid': 'wms-status-pill' } : {})}
        >
          <View
            style={[
              styles.wmsPulseDot,
              { backgroundColor: isWmsZoomEligible ? '#10B981' : '#d97706' }
            ]}
          />
          <Text style={styles.wmsBadgeText} numberOfLines={1}>
            {isWmsZoomEligible
              ? `${activeWmsConfig.stateCode} BhuNaksha WMS`
              : `Zoom ≥ ${activeWmsConfig.minZoom} for WMS`}
          </Text>
        </View>

        {/* Layer Toggle Pills */}
        <View style={styles.layerToggleGroup}>
          {/* Satellite */}
          <TouchableOpacity
            style={[
              styles.layerButton,
              activeLayer === 'satellite' && styles.layerButtonActive
            ]}
            onPress={() => setActiveLayer('satellite')}
            testID="layer-toggle-satellite"
            {...(Platform.OS === 'web' ? { 'data-testid': 'layer-toggle-satellite' } : {})}
            accessibilityLabel="Switch to Satellite imagery"
          >
            <Text
              style={[
                styles.layerButtonText,
                activeLayer === 'satellite' && styles.layerButtonTextActive
              ]}
            >
              🛰️ Satellite
            </Text>
          </TouchableOpacity>

          {/* OSM Cadastral */}
          <TouchableOpacity
            style={[
              styles.layerButton,
              activeLayer === 'cadastral' && styles.layerButtonActive
            ]}
            onPress={() => setActiveLayer('cadastral')}
            testID="layer-toggle-cadastral"
            {...(Platform.OS === 'web' ? { 'data-testid': 'layer-toggle-cadastral' } : {})}
            accessibilityLabel="Switch to Cadastral boundaries"
          >
            <Text
              style={[
                styles.layerButtonText,
                activeLayer === 'cadastral' && styles.layerButtonTextActive
              ]}
            >
              🗺️ Cadastral
            </Text>
          </TouchableOpacity>

          {/* Official NIC BhuNaksha WMS */}
          <TouchableOpacity
            style={[
              styles.layerButton,
              activeLayer === 'wms' && styles.layerButtonActive
            ]}
            onPress={() => setActiveLayer('wms')}
            testID="layer-toggle-wms"
            {...(Platform.OS === 'web' ? { 'data-testid': 'layer-toggle-wms' } : {})}
            accessibilityLabel="Switch to Official State NIC BhuNaksha WMS"
          >
            <Text
              style={[
                styles.layerButtonText,
                activeLayer === 'wms' && styles.layerButtonTextActive
              ]}
            >
              🏛️ NIC BhuNaksha
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slippy Tile Canvas & Interactive SVG Overlay */}
      <View
        ref={canvasWrapperRef}
        style={[styles.canvasWrapper, { height: mapDimensions.height }]}
        {...panResponder.panHandlers}
      >
        {/* Fallback Blueprint Grid */}
        <View style={styles.blueprintGrid} />

        {/* Base Raster Map Tiles (Esri Satellite or OSM Street) */}
        {visibleTiles.map((tile) => (
          <Image
            key={`base_${tile.key}`}
            source={{
              uri:
                activeLayer === 'satellite'
                  ? tile.satelliteUrl
                  : activeLayer === 'cadastral'
                  ? tile.cadastralUrl
                  : tile.satelliteUrl // Subtle satellite backdrop for WMS mode
            }}
            style={{
              position: 'absolute',
              left: tile.px,
              top: tile.py,
              width: tile.size,
              height: tile.size,
              opacity: activeLayer === 'wms' ? 0.45 : activeLayer === 'satellite' ? 0.95 : 0.85
            }}
            resizeMode="cover"
          />
        ))}

        {/* Live Official State WMS BhuNaksha Raster Tile Layer (z >= 14 multi-layer composition) */}
        {shouldRenderWmsTiles &&
          visibleTiles.map((tile) => {
            if (!tile.wmsCadastralUrl || wmsTileErrors[tile.key]) {
              return null;
            }
            return (
              <Image
                key={`wms_${tile.key}`}
                source={{ uri: tile.wmsCadastralUrl }}
                style={{
                  position: 'absolute',
                  left: tile.px,
                  top: tile.py,
                  width: tile.size,
                  height: tile.size,
                  opacity: 0.92
                }}
                resizeMode="contain"
                onError={() => handleWmsTileError(tile.key)}
              />
            );
          })}

        {/* Darkening / Vignette overlay for Satellite mode */}
        {activeLayer === 'satellite' && !shouldRenderWmsTiles && (
          <View pointerEvents="none" style={styles.satelliteVignette} />
        )}

        {/* Hardware-accelerated SVG Vector Polygon Overlay */}
        <Svg
          style={StyleSheet.absoluteFill}
          width={mapDimensions.width}
          height={mapDimensions.height}
        >
          {displayParcels.map((parcel) => {
            // Project polygon boundary points to screen pixels
            const pixelPoints = parcel.polygonCoordinates.map(([lat, lng]) =>
              geoToPixel(lat, lng, zoom, mapCenter.lat, mapCenter.lng, mapDimensions.width, mapDimensions.height)
            );

            const pointsString = pixelPoints.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ');

            // Project centroid for label and marker
            const centroidPixel = geoToPixel(
              parcel.coordinates.lat,
              parcel.coordinates.lng,
              zoom,
              mapCenter.lat,
              mapCenter.lng,
              mapDimensions.width,
              mapDimensions.height
            );

            const isSelected = selectedParcel?.id === parcel.id;
            const isDisputed = parcel.encumbranceStatus === 'DISPUTED';

            const strokeColor = isSelected
              ? '#0284c7'
              : isDisputed
              ? '#EF4444'
              : activeLayer === 'satellite'
              ? '#0284C7'
              : '#059669';

            const fillColor = isSelected
              ? 'rgba(56, 189, 248, 0.40)'
              : isDisputed
              ? 'rgba(239, 68, 68, 0.25)'
              : activeLayer === 'satellite'
              ? 'rgba(2, 132, 199, 0.20)'
              : 'rgba(16, 185, 129, 0.25)';

            return (
              <G key={parcel.id}>
                {/* Parcel Boundary Polygon */}
                <Polygon
                  points={pointsString}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3.5 : 1.8}
                  fill={fillColor}
                  testID={`parcel-polygon-${parcel.id}`}
                  onPress={() => onSelectParcel(parcel)}
                  {...(Platform.OS === 'web' ? { onClick: () => onSelectParcel(parcel) } : {})}
                />

                {/* Centroid Survey Number Label */}
                {centroidPixel.x > -50 &&
                  centroidPixel.x < mapDimensions.width + 50 &&
                  centroidPixel.y > -50 &&
                  centroidPixel.y < mapDimensions.height + 50 && (
                    <G>
                      {/* Selection Highlight Circle */}
                      {isSelected && (
                        <Circle
                          cx={centroidPixel.x}
                          cy={centroidPixel.y - 12}
                          r={5}
                          fill="#38BDF8"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      )}
                      <SvgText
                        x={centroidPixel.x}
                        y={isSelected ? centroidPixel.y + 4 : centroidPixel.y}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fill="#FFFFFF"
                        fontSize={isSelected ? '12' : '10'}
                        fontWeight="bold"
                        stroke="#e2e8f0"
                        strokeWidth={0.5}
                      >
                        {parcel.surveyNumber}
                      </SvgText>
                    </G>
                  )}
              </G>
            );
          })}
        </Svg>

        {/* Floating Zoom & Location Controls */}
        <View style={styles.floatingControls}>
          {/* Zoom In */}
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => setZoom((prev) => Math.min(19, prev + 1))}
            testID="zoom-in-btn"
            {...(Platform.OS === 'web' ? { 'data-testid': 'zoom-in-btn' } : {})}
            accessibilityLabel="Zoom in map"
          >
            <Plus size={18} color="#0f172a" />
          </TouchableOpacity>

          {/* Zoom Out */}
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => setZoom((prev) => Math.max(12, prev - 1))}
            testID="zoom-out-btn"
            {...(Platform.OS === 'web' ? { 'data-testid': 'zoom-out-btn' } : {})}
            accessibilityLabel="Zoom out map"
          >
            <Minus size={18} color="#0f172a" />
          </TouchableOpacity>

          {/* GPS Locate Button */}
          <TouchableOpacity
            style={[styles.floatingBtn, isLocating && styles.floatingBtnActive]}
            onPress={handleGpsLocate}
            testID="gps-locate-btn"
            {...(Platform.OS === 'web' ? { 'data-testid': 'gps-locate-btn' } : {})}
            accessibilityLabel="Locate current position"
          >
            <Locate size={18} color={isLocating ? '#0284c7' : '#F8FAFC'} />
          </TouchableOpacity>

          {/* Live WMS Overlay Toggle Button */}
          <TouchableOpacity
            style={[styles.floatingBtn, isWmsOverlayActive && styles.floatingBtnActive]}
            onPress={() => setIsWmsOverlayActive((prev) => !prev)}
            testID="wms-overlay-toggle"
            {...(Platform.OS === 'web' ? { 'data-testid': 'wms-overlay-toggle' } : {})}
            accessibilityLabel="Toggle live state WMS overlay"
          >
            <Layers size={18} color={isWmsOverlayActive ? '#0284c7' : '#64748b'} />
          </TouchableOpacity>
        </View>

        {/* Map Legend Overlay */}
        <View style={styles.bottomLegend}>
          <View style={styles.legendPill}>
            <View style={[styles.legendIndicator, { backgroundColor: '#38BDF8' }]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendPill}>
            <View style={[styles.legendIndicator, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Freehold</Text>
          </View>
          <View style={styles.legendPill}>
            <View style={[styles.legendIndicator, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Restricted</Text>
          </View>
          <View style={styles.legendPill}>
            <View style={[styles.legendIndicator, { backgroundColor: '#38BDF8' }]} />
            <Text style={styles.legendText}>NIC WMS: {activeWmsConfig.stateCode}</Text>
          </View>
        </View>
      </View>

      {/* Quick Jump Regional Presets Strip */}
      <View style={styles.regionStrip}>
        <Text style={styles.regionStripTitle}>QUICK JUMP:</Text>
        {REGIONAL_PRESETS.map((preset) => {
          const isActive = activeRegionId === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              style={[styles.regionChip, isActive && styles.regionChipActive]}
              onPress={() => handleSelectRegion(preset)}
              testID={`region-chip-${preset.id}`}
              {...(Platform.OS === 'web' ? { 'data-testid': `region-chip-${preset.id}` } : {})}
            >
              <Text
                style={[
                  styles.regionChipText,
                  isActive && styles.regionChipTextActive
                ]}
              >
                {preset.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Accessible Survey Number Quick Select Strip */}
      <View style={styles.surveyQuickStrip}>
        <Text style={styles.surveyQuickTitle}>PARCEL SURVEY NO:</Text>
        <View style={styles.surveyChipsContainer}>
          {parcels
            .filter((p) => {
              const currentP = REGIONAL_PRESETS.find((pr) => pr.id === activeRegionId);
              return !currentP || p.state === currentP.state;
            })
            .map((parcel) => {
              const isSelected = selectedParcel?.id === parcel.id;
              return (
                <TouchableOpacity
                  key={parcel.id}
                  style={[
                    styles.surveyChip,
                    isSelected && styles.surveyChipActive
                  ]}
                  onPress={() => {
                    onSelectParcel(parcel);
                    setMapCenter(parcel.coordinates);
                  }}
                  testID={`parcel-chip-${parcel.surveyNumber}`}
                  {...(Platform.OS === 'web' ? { 'data-testid': `parcel-chip-${parcel.surveyNumber}` } : {})}
                >
                  <Text
                    style={[
                      styles.surveyChipText,
                      isSelected && styles.surveyChipTextActive
                    ]}
                  >
                    {parcel.surveyNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f4f6fa',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
    flexWrap: 'wrap'
  },
  jurisdictionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flex: 1,
    minWidth: 140
  },
  jurisdictionText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600'
  },
  wmsLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1
  },
  wmsLiveBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981'
  },
  wmsLiveBadgeInactive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B'
  },
  wmsPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  wmsBadgeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '700'
  },
  layerToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    gap: 2
  },
  layerButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6
  },
  layerButtonActive: {
    backgroundColor: '#2563EB'
  },
  layerButtonText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600'
  },
  layerButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  canvasWrapper: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f4f6fa'
  },
  blueprintGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f4f6fa'
  },
  satelliteVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.06)'
  },
  floatingControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
    zIndex: 10
  },
  floatingBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffffcc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  floatingBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#f1f5f9'
  },
  bottomLegend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    backgroundColor: '#ffffffcc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    zIndex: 10,
    flexWrap: 'wrap'
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '600'
  },
  regionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  regionStripTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  regionChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  regionChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#38BDF8'
  },
  regionChipText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600'
  },
  regionChipTextActive: {
    color: '#0369a1',
    fontWeight: '700'
  },
  surveyQuickStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f4f6fa',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  surveyQuickTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  surveyChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1
  },
  surveyChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  surveyChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA'
  },
  surveyChipText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600'
  },
  surveyChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
