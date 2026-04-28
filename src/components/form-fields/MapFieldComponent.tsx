'use client';

import React, { Suspense, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Label } from '../ui/label';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

const MapFieldLazy = React.lazy(() =>
  import('../MapField').then((mod) => ({ default: mod.MapField })),
);

type DrawingMode = 'coordinate' | 'polygon' | 'circle' | 'rectangle' | 'line';

interface MapValue {
  coordinates: [number, number][];
  drawingMode?: DrawingMode;
  calculatedArea?: number;
  calculatedLength?: number;
  radius?: number;
}

// Calculate polygon area using Shoelace formula (returns m²)
const calculatePolygonArea = (coords: [number, number][]): number => {
  if (coords.length < 3) return 0;
  const earthRadius = 6371000; // meters
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lat1 = (coords[i][0] * Math.PI) / 180;
    const lat2 = (coords[j][0] * Math.PI) / 180;
    const lng1 = (coords[i][1] * Math.PI) / 180;
    const lng2 = (coords[j][1] * Math.PI) / 180;
    area += lng2 - lng1;
    area *=
      earthRadius *
      earthRadius *
      Math.cos((lat1 + lat2) / 2) *
      ((lng2 - lng1) / 2);
  }
  return Math.abs(area);
};

// Calculate rectangle area (returns m²)
const calculateRectangleArea = (
  corner1: [number, number],
  corner2: [number, number],
): number => {
  const earthRadius = 6371000;
  const lat1 = (corner1[0] * Math.PI) / 180;
  const lat2 = (corner2[0] * Math.PI) / 180;
  const lng1 = (corner1[1] * Math.PI) / 180;
  const lng2 = (corner2[1] * Math.PI) / 180;
  const width =
    Math.abs(lng2 - lng1) * earthRadius * Math.cos((lat1 + lat2) / 2);
  const height = Math.abs(lat2 - lat1) * earthRadius;
  return width * height;
};

// Calculate line length (returns meters)
const calculateLineLength = (coords: [number, number][]): number => {
  if (coords.length < 2) return 0;
  const earthRadius = 6371000;
  let totalLength = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const lat1 = (coords[i][0] * Math.PI) / 180;
    const lat2 = (coords[i + 1][0] * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLng = ((coords[i + 1][1] - coords[i][1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalLength += earthRadius * c;
  }
  return totalLength;
};

// Format area with unit conversion
const formatArea = (area: number, unit: string): string => {
  if (!area || area === 0) return '0 ' + unit;
  let convertedArea = area;
  switch (unit) {
    case 'km²':
      convertedArea = area / 1000000;
      break;
    case 'hectare':
      convertedArea = area / 10000;
      break;
    case 'acre':
      convertedArea = area / 4046.86;
      break;
    default:
      convertedArea = area;
  }
  return `${convertedArea.toFixed(2)} ${unit}`;
};

// Format length with unit conversion
const formatLength = (length: number, unit: string): string => {
  if (!length || length === 0) return '0 ' + unit;
  let convertedLength = length;
  switch (unit) {
    case 'km':
      convertedLength = length / 1000;
      break;
    case 'mi':
      convertedLength = length / 1609.34;
      break;
    default:
      convertedLength = length;
  }
  return `${convertedLength.toFixed(2)} ${unit}`;
};

/**
 * Map field for location/shape selection
 * Supports coordinate, polygon, circle, rectangle, and line drawing modes
 */
export function MapFieldComponent({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  // Parse the map value
  const mapValue: MapValue = value || {};
  const coordinates: [number, number][] =
    mapValue.coordinates || field.mapCoordinates || [];

  const calculatedArea = mapValue.calculatedArea || field.calculatedArea || 0;
  const calculatedLength =
    mapValue.calculatedLength || field.calculatedLength || 0;
  const radius = mapValue.radius || 0;
  const mapCenter = field.mapCenter || [27.7172, 85.324];
  const mapZoom = field.mapZoom || 13;
  const mapMinZoom = field.mapMinZoom;
  const mapMaxZoom = field.mapMaxZoom;
  const drawingMode: DrawingMode = field.mapDrawingMode || 'coordinate';
  const areaUnit = field.areaUnit || 'm²';
  const lengthUnit = field.lengthUnit || 'm';

  const getShapeLabel = () => {
    switch (drawingMode) {
      case 'coordinate':
        return 'Coordinate';
      case 'polygon':
        return 'Polygon';
      case 'circle':
        return 'Circle';
      case 'rectangle':
        return 'Rectangle';
      case 'line':
        return 'Line';
      default:
        return 'Shape';
    }
  };

  const handleCoordinatesChange = (newCoordinates: [number, number][]) => {
    const newValue: MapValue = {
      coordinates: newCoordinates,
      drawingMode,
    };

    if (drawingMode === 'polygon' && newCoordinates.length >= 3) {
      newValue.calculatedArea = calculatePolygonArea(newCoordinates);
    } else if (drawingMode === 'rectangle' && newCoordinates.length === 2) {
      newValue.calculatedArea = calculateRectangleArea(
        newCoordinates[0],
        newCoordinates[1],
      );
    } else if (drawingMode === 'line' && newCoordinates.length >= 2) {
      newValue.calculatedLength = calculateLineLength(newCoordinates);
    }

    onChange(newValue);
  };

  const handleAreaChange = (area: number) => {
    onChange({
      ...mapValue,
      calculatedArea: area,
    });
  };

  const handleLengthChange = (length: number) => {
    onChange({
      ...mapValue,
      calculatedLength: length,
    });
  };

  const handleRadiusChange = (newRadius: number) => {
    onChange({
      ...mapValue,
      radius: newRadius,
    });
  };

  return (
    <div id={`field-${field.id}`} className={cn('space-y-2', className)}>
      <Label required={field.required}>{field.label}</Label>
      {field.instruction && (
        <p className='text-xs text-gray-500'>{field.instruction}</p>
      )}

      {/* Map Component */}
      <div className='border rounded-lg overflow-hidden'>
        <Suspense
          fallback={
            <div className='w-full h-64 bg-muted rounded-lg flex items-center justify-center'>
              <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
            </div>
          }>
          <MapFieldLazy
            key={field.id}
            fieldId={field.id}
            coordinates={coordinates}
            drawingMode={drawingMode}
            radius={radius}
            onCoordinatesChange={handleCoordinatesChange}
            onAreaChange={handleAreaChange}
            onLengthChange={handleLengthChange}
            onRadiusChange={handleRadiusChange}
            center={mapCenter}
            zoom={mapZoom}
            minZoom={mapMinZoom}
            maxZoom={mapMaxZoom}
            disabled={disabled}
          />
        </Suspense>
      </div>

      {/* Show coordinates and measurements */}
      {coordinates.length > 0 && (
        <div className='space-y-3'>
          {(calculatedArea > 0 || calculatedLength > 0) && (
            <div className='p-3 bg-blue-50 border border-blue-200 rounded-md'>
              {calculatedArea > 0 && (
                <p className='text-sm font-medium text-blue-800'>
                  Area: {formatArea(calculatedArea, areaUnit)}
                </p>
              )}
              {calculatedLength > 0 && (
                <p className='text-sm font-medium text-blue-800'>
                  Length: {formatLength(calculatedLength, lengthUnit)}
                </p>
              )}
              {radius > 0 && drawingMode === 'circle' && (
                <p className='text-sm font-medium text-blue-800'>
                  Radius: {radius.toFixed(2)} m
                </p>
              )}
            </div>
          )}

          {/* Show coordinates list */}
          <div className='p-3 bg-gray-50 border border-gray-200 rounded-md'>
            <p className='text-sm font-medium text-gray-700 mb-2'>
              {getShapeLabel()} Coordinates ({coordinates.length} point
              {coordinates.length !== 1 ? 's' : ''}):
            </p>
            <div className='max-h-32 overflow-y-auto space-y-1'>
              {coordinates.map((coord, idx) => (
                <div
                  key={idx}
                  className='text-xs text-gray-600 flex items-center gap-2'>
                  <MapPin className='w-3 h-3 text-primary' />
                  <span>
                    Point {idx + 1}: {coord[0].toFixed(6)},{' '}
                    {coord[1].toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {showError && errorMessage && (
        <p className='text-sm text-red-600 mt-1'>{errorMessage}</p>
      )}
    </div>
  );
}
