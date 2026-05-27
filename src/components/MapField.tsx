'use client';

import '../map-field-styles';
import React, { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  Rectangle,
  Polyline,
  useMapEvents,
  Marker,
} from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
// Only run on client side to avoid SSR issues
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Create custom pin icon for location picking
const createPinIcon = (
  color: string = '#3b82f6',
  size: 'small' | 'large' = 'large',
) => {
  const iconSize = size === 'large' ? 40 : 30;
  const pinSVG = `
    <svg width="${iconSize}" height="${iconSize + 10}" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <defs>
        <linearGradient id="pinGradient-${color.replace('#', '')}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Pin shadow -->
      <ellipse cx="12" cy="30" rx="4" ry="2" fill="rgba(0,0,0,0.2)"/>
      <!-- Pin body -->
      <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0Z" fill="url(#pinGradient-${color.replace('#', '')})" stroke="white" stroke-width="1.5"/>
      <!-- Pin center dot -->
      <circle cx="12" cy="8" r="2.5" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-pin-marker',
    html: pinSVG,
    iconSize: [iconSize, iconSize + 10],
    iconAnchor: [iconSize / 2, iconSize + 10],
    popupAnchor: [0, -(iconSize + 10)],
  });
};

// Create coordinate pin icon (green pin for single coordinate selection)
const createCoordinatePinIcon = () => createPinIcon('#10b981', 'large');

// Create drawing pin icon (blue pin for polygon/line points)
const createDrawingPinIcon = () => createPinIcon('#3b82f6', 'small');

type DrawingMode = 'coordinate' | 'polygon' | 'circle' | 'rectangle' | 'line';

interface MapFieldProps {
  coordinates: [number, number][];
  onCoordinatesChange: (coordinates: [number, number][]) => void;
  onAreaChange?: (area: number) => void;
  onLengthChange?: (length: number) => void;
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  disabled?: boolean;
  drawingMode?: DrawingMode;
  radius?: number; // For circle mode
  onRadiusChange?: (radius: number) => void;
  fieldId?: string;
}

// Component to handle map click events
function MapClickHandler({
  onMapClick,
  disabled,
  drawingMode,
}: {
  onMapClick: (lat: number, lng: number) => void;
  disabled?: boolean;
  drawingMode?: DrawingMode;
}) {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Calculate polygon area using the shoelace formula (for spherical coordinates)
function calculatePolygonArea(coordinates: [number, number][]): number {
  if (coordinates.length < 3) return 0;

  const coords = coordinates.map(([lat, lng]) => [
    (lat * Math.PI) / 180,
    (lng * Math.PI) / 180,
  ]);

  const R = 6378137; // Earth's radius in meters
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area +=
      (coords[j][1] - coords[i][1]) *
      (2 + Math.sin(coords[i][0]) + Math.sin(coords[j][0]));
  }
  area = (area * R * R) / 2;
  return Math.abs(area);
}

// Calculate distance between two points in meters
function calculateDistance(
  point1: [number, number],
  point2: [number, number],
): number {
  const R = 6378137; // Earth's radius in meters
  const lat1 = (point1[0] * Math.PI) / 180;
  const lat2 = (point2[0] * Math.PI) / 180;
  const deltaLat = lat2 - lat1;
  const deltaLng = ((point2[1] - point1[1]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate total line length
function calculateLineLength(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;
  let totalLength = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalLength += calculateDistance(coordinates[i], coordinates[i + 1]);
  }
  return totalLength;
}

// Calculate rectangle area
function calculateRectangleArea(
  corner1: [number, number],
  corner2: [number, number],
): number {
  const lat1 = (corner1[0] * Math.PI) / 180;
  const lat2 = (corner2[0] * Math.PI) / 180;
  const lng1 = (corner1[1] * Math.PI) / 180;
  const lng2 = (corner2[1] * Math.PI) / 180;

  const R = 6378137;
  const width = R * Math.abs(lng2 - lng1) * Math.cos((lat1 + lat2) / 2);
  const height = R * Math.abs(lat2 - lat1);
  return width * height;
}

// Calculate circle area
function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius;
}

export function MapField({
  coordinates,
  onCoordinatesChange,
  onAreaChange,
  onLengthChange,
  center = [27.7172, 85.324],
  zoom = 13,
  minZoom,
  maxZoom,
  disabled = false,
  drawingMode = 'coordinate',
  radius = 0,
  onRadiusChange,
  fieldId = 'default',
}: MapFieldProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempPoint, setTempPoint] = useState<[number, number] | null>(null);

  // Use a ref for the unique ID to ensure it persists for the lifetime of the component
  const containerIdRef = useRef<string>(
    `map-${fieldId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );

  // Cleanup map instance on unmount and during navigation
  useEffect(() => {
    const handleCleanup = () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        // Also heavy cleanup of the DOM node just in case
        const container = document.getElementById(containerIdRef.current);
        if (container) {
          const innerLeaflet = container.querySelector('.leaflet-container');
          if (innerLeaflet) {
            (innerLeaflet as any)._leaflet_id = null;
          }
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('pagehide', handleCleanup);
    window.addEventListener('beforeunload', handleCleanup);

    return () => {
      handleCleanup();
      window.removeEventListener('pagehide', handleCleanup);
      window.removeEventListener('beforeunload', handleCleanup);
    };
  }, []);

  const prevCoordinatesRef = useRef<[number, number][]>(coordinates);
  const onAreaChangeRef = useRef(onAreaChange);
  const onLengthChangeRef = useRef(onLengthChange);
  const onRadiusChangeRef = useRef(onRadiusChange);

  useEffect(() => {
    onAreaChangeRef.current = onAreaChange;
    onLengthChangeRef.current = onLengthChange;
    onRadiusChangeRef.current = onRadiusChange;
  }, [onAreaChange, onLengthChange, onRadiusChange]);

  useEffect(() => {
    if (
      coordinates.length !== prevCoordinatesRef.current.length ||
      coordinates.some(
        (coord, idx) =>
          coord[0] !== prevCoordinatesRef.current[idx]?.[0] ||
          coord[1] !== prevCoordinatesRef.current[idx]?.[1],
      )
    ) {
      prevCoordinatesRef.current = coordinates;

      if (drawingMode === 'polygon' && coordinates.length >= 3) {
        const area = calculatePolygonArea(coordinates);
        onAreaChangeRef.current?.(area);
      } else if (drawingMode === 'rectangle' && coordinates.length === 2) {
        const area = calculateRectangleArea(coordinates[0], coordinates[1]);
        onAreaChangeRef.current?.(area);
      } else if (drawingMode === 'line' && coordinates.length >= 2) {
        const length = calculateLineLength(coordinates);
        onLengthChangeRef.current?.(length);
      } else if (drawingMode === 'circle' && radius > 0) {
        const area = calculateCircleArea(radius);
        onAreaChangeRef.current?.(area);
      } else {
        onAreaChangeRef.current?.(0);
        onLengthChangeRef.current?.(0);
      }
    }
  }, [coordinates, drawingMode, radius]);

  const handleMapClick = (lat: number, lng: number) => {
    if (disabled) return;

    if (drawingMode === 'coordinate') {
      // Single coordinate mode - replace existing
      onCoordinatesChange([[lat, lng]]);
      setIsDrawing(false);
    } else if (drawingMode === 'polygon') {
      const newCoordinates: [number, number][] = [...coordinates, [lat, lng]];
      onCoordinatesChange(newCoordinates);
      setIsDrawing(true);
    } else if (drawingMode === 'circle') {
      if (coordinates.length === 0) {
        // First click sets center
        onCoordinatesChange([[lat, lng]]);
        setTempPoint([lat, lng]);
        setIsDrawing(true);
      } else {
        // Second click sets radius (keep center, just update radius)
        const center = coordinates[0];
        const newRadius = calculateDistance(center, [lat, lng]);
        onRadiusChangeRef.current?.(newRadius);
        setTempPoint(null);
        setIsDrawing(false);
      }
    } else if (drawingMode === 'rectangle') {
      if (coordinates.length === 0) {
        // First click sets first corner
        onCoordinatesChange([[lat, lng]]);
        setTempPoint([lat, lng]);
      } else if (coordinates.length === 1) {
        // Second click sets second corner
        onCoordinatesChange([coordinates[0], [lat, lng]]);
        setTempPoint(null);
        setIsDrawing(false);
      }
    } else if (drawingMode === 'line') {
      const newCoordinates: [number, number][] = [...coordinates, [lat, lng]];
      onCoordinatesChange(newCoordinates);
      setIsDrawing(true);
    }
  };

  const handleRemoveLastPoint = () => {
    if (coordinates.length > 0) {
      if (drawingMode === 'coordinate') {
        onCoordinatesChange([]);
      } else if (drawingMode === 'circle' && coordinates.length === 1) {
        onCoordinatesChange([]);
        onRadiusChangeRef.current?.(0);
      } else if (drawingMode === 'rectangle' && coordinates.length === 2) {
        onCoordinatesChange([coordinates[0]]);
      } else {
        const newCoordinates = coordinates.slice(0, -1);
        onCoordinatesChange(newCoordinates);
      }
      if (coordinates.length <= 1) {
        setIsDrawing(false);
      }
    }
  };

  const handleClearAll = () => {
    onCoordinatesChange([]);
    setIsDrawing(false);
    setTempPoint(null);
    onAreaChangeRef.current?.(0);
    onLengthChangeRef.current?.(0);
    onRadiusChangeRef.current?.(0);
  };

  const handleFinishDrawing = () => {
    if (
      (drawingMode === 'polygon' && coordinates.length >= 3) ||
      (drawingMode === 'line' && coordinates.length >= 2) ||
      (drawingMode === 'rectangle' && coordinates.length === 2) ||
      (drawingMode === 'circle' && coordinates.length === 1 && radius > 0) ||
      (drawingMode === 'coordinate' && coordinates.length === 1)
    ) {
      setIsDrawing(false);
    }
  };

  const handleMarkerDragEnd = (index: number, event: any) => {
    if (disabled) return;
    const newLat = event.target.getLatLng().lat;
    const newLng = event.target.getLatLng().lng;
    const newCoordinates = [...coordinates];
    newCoordinates[index] = [newLat, newLng];

    if (drawingMode === 'circle' && index === 0) {
      // If center is moved, recalculate radius if we have one
      if (radius > 0 && tempPoint) {
        const newRadius = calculateDistance([newLat, newLng], tempPoint);
        onRadiusChangeRef.current?.(newRadius);
      }
    }

    onCoordinatesChange(newCoordinates);
  };

  // Get rectangle bounds for rendering
  const getRectangleBounds = ():
    | [[number, number], [number, number]]
    | null => {
    if (drawingMode === 'rectangle' && coordinates.length === 2) {
      return [coordinates[0], coordinates[1]];
    }
    if (drawingMode === 'rectangle' && coordinates.length === 1 && tempPoint) {
      return [coordinates[0], tempPoint];
    }
    return null;
  };

  const polygonOptions = {
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
    weight: 2,
  };

  const lineOptions = {
    color: '#3b82f6',
    weight: 3,
  };

  const circleOptions = {
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
    weight: 2,
  };

  const rectangleOptions = {
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
    weight: 2,
  };

  const getModeInstructions = () => {
    switch (drawingMode) {
      case 'coordinate':
        return 'Click on the map to select a coordinate point';
      case 'polygon':
        return 'Click on the map to add points and draw a shape';
      case 'circle':
        return coordinates.length === 0
          ? 'Click to set the center of the circle'
          : 'Click again to set the radius, or drag the center marker';
      case 'rectangle':
        return coordinates.length === 0
          ? 'Click to set the first corner of the rectangle'
          : 'Click to set the second corner';
      case 'line':
        return 'Click on the map to add points and draw a line';
      default:
        return '';
    }
  };

  const canFinish = () => {
    if (drawingMode === 'coordinate') return coordinates.length === 1;
    if (drawingMode === 'polygon') return coordinates.length >= 3;
    if (drawingMode === 'circle') return coordinates.length === 1 && radius > 0;
    if (drawingMode === 'rectangle') return coordinates.length === 2;
    if (drawingMode === 'line') return coordinates.length >= 2;
    return false;
  };

  return (
    <div className='w-full p-2 space-y-2'>
      <div className='flex  gap-2 flex-wrap'>
        <button
          type='button'
          onClick={handleRemoveLastPoint}
          disabled={coordinates.length === 0 || disabled}
          className='px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-gray-300'>
          Remove Last Point
        </button>
        {/* <button
          type='button'
          onClick={handleClearAll}
          disabled={coordinates.length === 0 || disabled}
          className='px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-red-300 text-red-700'>
          Clear All
        </button> */}
        {isDrawing && canFinish() && (
          <button
            type='button'
            onClick={handleFinishDrawing}
            disabled={disabled}
            className='px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-green-300 text-green-700'>
            Finish Drawing
          </button>
        )}
      </div>
      <div
        id={containerIdRef.current}
        className='form-kit-map h-[400px] w-full border border-border rounded-md overflow-hidden relative'>
        <MapContainer
          key={containerIdRef.current}
          center={center}
          zoom={zoom}
          minZoom={minZoom}
          maxZoom={maxZoom}
          style={{ height: '100%', width: '100%', minHeight: '300px' }}
          ref={(map) => {
            if (map) {
              mapRef.current = map;
              setTimeout(() => {
                try {
                  map.invalidateSize();
                } catch (e) {
                  // ignore
                }
              }, 100);
            } else {
              mapRef.current = null;
            }
          }}
          className='z-0'>
          {/* Google Maps Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
            maxZoom={20}
          />
          {/* Optional: Add satellite layer as overlay (commented out by default) */}
          {/* <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url='https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
            maxZoom={20}
            opacity={0.5}
          /> */}
          <MapClickHandler
            onMapClick={handleMapClick}
            disabled={disabled}
            drawingMode={drawingMode}
          />
          {coordinates.length > 0 && (
            <>
              {/* Render pin markers - always show for all modes including coordinate */}
              {coordinates.map((coord, index) => (
                <Marker
                  key={index}
                  position={coord}
                  draggable={!disabled}
                  eventHandlers={{
                    dragend: (e) => handleMarkerDragEnd(index, e),
                  }}
                  icon={
                    drawingMode === 'coordinate'
                      ? createCoordinatePinIcon()
                      : createDrawingPinIcon()
                  }
                />
              ))}

              {/* Render shapes based on mode */}
              {drawingMode === 'polygon' && coordinates.length >= 2 && (
                <>
                  {/* Show partial polygon line for 2+ points */}
                  {coordinates.length >= 2 && (
                    <Polyline
                      positions={coordinates}
                      pathOptions={{
                        ...lineOptions,
                        color: '#3b82f6',
                        weight: 2,
                        dashArray: coordinates.length < 3 ? '5, 5' : undefined,
                      }}
                    />
                  )}
                  {/* Show filled polygon only when complete (3+ points) */}
                  {coordinates.length >= 3 && (
                    <Polygon
                      positions={coordinates}
                      pathOptions={polygonOptions}
                    />
                  )}
                </>
              )}

              {drawingMode === 'circle' &&
                coordinates.length === 1 &&
                radius > 0 && (
                  <Circle
                    center={coordinates[0]}
                    radius={radius}
                    pathOptions={circleOptions}
                  />
                )}

              {drawingMode === 'rectangle' && getRectangleBounds() && (
                <Rectangle
                  bounds={getRectangleBounds()!}
                  pathOptions={rectangleOptions}
                />
              )}

              {drawingMode === 'line' && coordinates.length >= 2 && (
                <Polyline positions={coordinates} pathOptions={lineOptions} />
              )}

              {/* Show temporary point for circle/rectangle */}
              {tempPoint && (
                <Marker
                  position={tempPoint}
                  icon={createPinIcon('#ef4444', 'small')}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>
      <div className='text-sm text-gray-600'>
        <p>{getModeInstructions()}</p>
        {coordinates.length > 0 && (
          <div className='mt-1 space-y-1'>
            <p className='text-xs text-gray-500'>
              {drawingMode === 'coordinate'
                ? '1 coordinate selected'
                : `${coordinates.length} point${coordinates.length !== 1 ? 's' : ''} added`}
              {drawingMode === 'circle' &&
                radius > 0 &&
                ` • Radius: ${radius.toFixed(2)}m`}
              {drawingMode !== 'coordinate' && drawingMode !== 'circle' && (
                <span>. All coordinates are saved automatically</span>
              )}
            </p>
            {drawingMode === 'polygon' && coordinates.length < 3 && (
              <p className='text-xs text-amber-600'>
                Add at least {3 - coordinates.length} more point
                {3 - coordinates.length !== 1 ? 's' : ''} to complete the shape
              </p>
            )}
            {drawingMode === 'line' && coordinates.length < 2 && (
              <p className='text-xs text-amber-600'>
                Add at least 1 more point to draw a line
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
