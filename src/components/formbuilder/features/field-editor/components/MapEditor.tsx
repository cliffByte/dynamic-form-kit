'use client';

import React, { Suspense } from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';

const MapCenterPickerLazy = React.lazy(() =>
  import('../../../../MapCenterPicker').then((mod) => ({
    default: mod.MapCenterPicker,
  })),
);

interface MapEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const MapEditor: React.FC<MapEditorProps> = ({ field, updateField }) => {
  if (field.type !== 'map') return null;

  return (
    <div className='space-y-4 border-t pt-4'>
      <h4 className='text-sm font-medium text-gray-700'>Map Configuration</h4>

      <div className='space-y-2'>
        <Label className='text-xs font-semibold'>Drawing Mode</Label>
        <select
          value={field.mapDrawingMode || 'point'}
          onChange={(e) =>
            updateField(field.id, {
              mapDrawingMode: e.target.value as any,
            })
          }
          className='w-full h-9 border rounded-md px-3 text-sm'>
          <option value='coordinate'>Coordinate (Single Point)</option>
          <option value='polygon'>Polygon (Custom Shape)</option>
          <option value='rectangle'>Rectangle</option>
          <option value='circle'>Circle</option>
          <option value='line'>Line (Path)</option>
        </select>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label className='text-xs uppercase text-muted-foreground'>
            Center Latitude
          </Label>
          <Input
            type='number'
            step='0.000001'
            value={field.mapCenter?.[0] || ''}
            onChange={(e) =>
              updateField(field.id, {
                mapCenter: [
                  parseFloat(e.target.value),
                  field.mapCenter?.[1] || 85.324,
                ],
              })
            }
            className='h-8 text-xs'
          />
        </div>
        <div className='space-y-1.5'>
          <Label className='text-xs uppercase text-muted-foreground'>
            Center Longitude
          </Label>
          <Input
            type='number'
            step='0.000001'
            value={field.mapCenter?.[1] || ''}
            onChange={(e) =>
              updateField(field.id, {
                mapCenter: [
                  field.mapCenter?.[0] || 27.7172,
                  parseFloat(e.target.value),
                ],
              })
            }
            className='h-8 text-xs'
          />
        </div>
      </div>

      <div className='grid grid-cols-3 gap-3'>
        <div className='space-y-2'>
          <Label className='text-xs font-semibold'>Zoom</Label>
          <Input
            type='number'
            min='1'
            max='20'
            value={field.mapZoom || 13}
            onChange={(e) =>
              updateField(field.id, { mapZoom: parseInt(e.target.value) || 13 })
            }
            className='w-full'
          />
        </div>
        <div className='space-y-2'>
          <Label className='text-xs font-semibold'>Min Zoom</Label>
          <Input
            type='number'
            min='1'
            max='20'
            value={field.mapMinZoom ?? ''}
            onChange={(e) =>
              updateField(field.id, {
                mapMinZoom: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              })
            }
            className='w-full'
            placeholder='Auto'
          />
        </div>
        <div className='space-y-2'>
          <Label className='text-xs font-semibold'>Max Zoom</Label>
          <Input
            type='number'
            min='1'
            max='20'
            value={field.mapMaxZoom ?? ''}
            onChange={(e) =>
              updateField(field.id, {
                mapMaxZoom: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              })
            }
            className='w-full'
            placeholder='Auto'
          />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3 border-t pt-3'>
        <div className='space-y-2'>
          <Label className='text-xs font-semibold'>Area Unit</Label>
          <select
            value={field.areaUnit || 'm²'}
            onChange={(e) =>
              updateField(field.id, {
                areaUnit: e.target.value as any,
              })
            }
            className='w-full h-8 border rounded-md px-2 text-xs'>
            <option value='m²'>Square Meters (m²)</option>
            <option value='km²'>Square Kilometers (km²)</option>
            <option value='hectare'>Hectare</option>
            <option value='acre'>Acre</option>
          </select>
        </div>
        <div className='space-y-2'>
          <Label className='text-xs font-semibold'>Length Unit</Label>
          <select
            value={field.lengthUnit || 'm'}
            onChange={(e) =>
              updateField(field.id, {
                lengthUnit: e.target.value as any,
              })
            }
            className='w-full h-8 border rounded-md px-2 text-xs'>
            <option value='m'>Meters (m)</option>
            <option value='km'>Kilometers (km)</option>
            <option value='mi'>Miles (mi)</option>
          </select>
        </div>
      </div>

      <div className='mt-2 border rounded-md overflow-hidden'>
        <div className='bg-muted/50 p-2 text-[10px] font-bold uppercase text-muted-foreground border-b text-center'>
          Click on map to set default center
        </div>
        <div className='h-[200px] w-full'>
          <Suspense fallback={null}>
            <MapCenterPickerLazy
              center={field.mapCenter || [27.7172, 85.324]}
              onCenterChange={(center) =>
                updateField(field.id, { mapCenter: center })
              }
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
