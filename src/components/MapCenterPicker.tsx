'use client';

import '../map-field-styles';
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
// Fix for default marker icons in Leaflet (client-only)
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

// Create custom pin icon for center picker
const createCenterPinIcon = () => {
  const iconSize = 40;
  const pinSVG = `
    <svg width="${iconSize}" height="${iconSize + 10}" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <defs>
        <linearGradient id="centerPinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#10b981dd;stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Pin shadow -->
      <ellipse cx="12" cy="30" rx="4" ry="2" fill="rgba(0,0,0,0.2)"/>
      <!-- Pin body -->
      <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0Z" fill="url(#centerPinGradient)" stroke="white" stroke-width="1.5"/>
      <!-- Pin center dot -->
      <circle cx="12" cy="8" r="2.5" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    className: 'center-pin-marker',
    html: pinSVG,
    iconSize: [iconSize, iconSize + 10],
    iconAnchor: [iconSize / 2, iconSize + 10],
    popupAnchor: [0, -(iconSize + 10)],
  });
};

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface MapCenterPickerProps {
  center: [number, number];
  onCenterChange: (center: [number, number]) => void;
}

export function MapCenterPicker({
  center,
  onCenterChange,
}: MapCenterPickerProps) {
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(center);
  const mapRef = useRef<L.Map | null>(null);
  const containerIdRef = useRef<string>(
    `map-center-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );

  useEffect(() => {
    setCurrentCenter(center);
  }, [center]);

  // Cleanup map instance on unmount and during navigation
  useEffect(() => {
    const handleCleanup = () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        // Force cleanup of the internal Leaflet ID on the DOM element
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

  const handleMapClick = (lat: number, lng: number) => {
    const newCenter: [number, number] = [lat, lng];
    setCurrentCenter(newCenter);
    onCenterChange(newCenter);
  };

  return (
    <div
      id={containerIdRef.current}
      className='form-kit-map h-[300px] w-full border border-border rounded-md overflow-hidden relative'>
      <MapContainer
        key={containerIdRef.current}
        center={currentCenter}
        zoom={13}
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
        <MapClickHandler onMapClick={handleMapClick} />
        <Marker
          position={currentCenter}
          draggable={true}
          icon={createCenterPinIcon()}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const coords = marker.getLatLng();
              const newCenter: [number, number] = [coords.lat, coords.lng];
              setCurrentCenter(newCenter);
              onCenterChange(newCenter);
            },
          }}
        />
      </MapContainer>
      <div className='p-2 bg-gray-50 border-t border-gray-200'>
        <p className='text-xs text-gray-600 text-center'>
          Click on the map or drag the pin to set the default center location
        </p>
      </div>
    </div>
  );
}
