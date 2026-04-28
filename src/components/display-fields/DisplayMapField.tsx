'use client';

import React, { Suspense } from 'react';
import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, ExternalLink } from 'lucide-react';

const MapFieldLazy = React.lazy(() =>
  import('../MapField').then((mod) => ({ default: mod.MapField })),
);

export function DisplayMapField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const mapValue = value as {
    coordinates: [number, number][];
    drawingMode?: string;
    calculatedArea?: number;
    calculatedLength?: number;
    radius?: number;
  };

  const hasValue =
    mapValue && mapValue.coordinates && mapValue.coordinates.length > 0;

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      <div className='w-full space-y-3 p-4'>
        {hasValue ? (
          <>
            <div className='h-100 max-w-6xl rounded-lg border border-border overflow-hidden shadow-sm'>
              <Suspense
                fallback={
                  <div className='w-full h-64 bg-muted animate-pulse rounded-md' />
                }>
                <MapFieldLazy
                  key={field.id}
                  fieldId={field.id}
                  drawingMode={
                    (mapValue.drawingMode as any) ||
                    field.mapDrawingMode ||
                    'coordinate'
                  }
                  coordinates={mapValue.coordinates}
                  onCoordinatesChange={() => {}}
                  radius={mapValue.radius}
                  disabled={true}
                />
              </Suspense>
            </div>

            <div className='bg-muted/30 rounded-lg p-5 border border-border/50 shadow-sm'>
              <div className='flex items-center justify-between mb-4 pb-2 border-b border-border/30'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-primary/10 rounded-lg'>
                    <MapPin className='w-4 h-4 text-primary' />
                  </div>
                  <div>
                    <h4 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                      Location Details
                    </h4>
                    <p className='text-[10px] text-muted-foreground'>
                      {(
                        mapValue.drawingMode ||
                        field.mapDrawingMode ||
                        'coordinate'
                      ).toUpperCase()}{' '}
                      Mode • {mapValue.coordinates.length} Point(s)
                    </p>
                  </div>
                </div>
                {mapValue.coordinates.length === 1 && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 text-[11px] font-medium'
                    asChild>
                    <a
                      href={`https://www.google.com/maps?q=${mapValue.coordinates[0][0]},${mapValue.coordinates[0][1]}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1.5'>
                      <ExternalLink className='w-3.5 h-3.5' />
                      Google Maps
                    </a>
                  </Button>
                )}
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                <div className='space-y-3'>
                  <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-tight ml-1'>
                    Coordinates
                  </p>
                  <div className='grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar'>
                    {mapValue.coordinates.map((coord, idx) => (
                      <div
                        key={idx}
                        className='group flex items-center gap-3 text-[11px] font-mono bg-background p-2.5 rounded-md border border-border/40 hover:border-primary/30 transition-all hover:shadow-sm'>
                        <span className='flex-shrink-0 w-6 h-6 flex items-center justify-center bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary rounded-full text-[10px] font-bold transition-colors'>
                          {idx + 1}
                        </span>
                        <div className='flex flex-col gap-0.5 overflow-hidden flex-1'>
                          <div className='flex items-center gap-2 truncate'>
                            <span className='text-muted-foreground/60 w-8 font-medium'>
                              LAT
                            </span>
                            <span className='font-bold text-foreground tracking-tight'>
                              {coord[0].toFixed(6)}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 truncate'>
                            <span className='text-muted-foreground/60 w-8 font-medium'>
                              LNG
                            </span>
                            <span className='font-bold text-foreground tracking-tight'>
                              {coord[1].toFixed(6)}
                            </span>
                          </div>
                        </div>
                        {mapValue.coordinates.length > 1 && (
                          <a
                            href={`https://www.google.com/maps?q=${coord[0]},${coord[1]}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-primary transition-all'
                            title='View on Google Maps'>
                            <ExternalLink className='w-3 h-3' />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className='flex flex-col gap-3'>
                  <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-tight ml-1'>
                    Calculated Properties
                  </p>
                  <div className='space-y-0.5 bg-background/50 rounded-lg border border-border/30 overflow-hidden'>
                    <div className='flex items-center justify-between p-3 text-xs'>
                      <span className='text-muted-foreground font-medium'>
                        Drawing Mode
                      </span>
                      <Badge
                        variant='secondary'
                        className='h-5 text-[10px] capitalize font-semibold tracking-wide'>
                        {mapValue.drawingMode ||
                          field.mapDrawingMode ||
                          'coordinate'}
                      </Badge>
                    </div>

                    {mapValue.radius !== undefined && (
                      <div className='flex items-center justify-between p-3 text-xs border-t border-border/10'>
                        <span className='text-muted-foreground font-medium'>
                          Circle Radius
                        </span>
                        <span className='font-mono font-bold text-foreground bg-muted/50 px-2 py-1 rounded'>
                          {mapValue.radius.toFixed(2)} m
                        </span>
                      </div>
                    )}

                    {mapValue.calculatedArea !== undefined && (
                      <div className='flex items-center justify-between p-3 text-xs border-t border-border/10'>
                        <span className='text-muted-foreground font-medium'>
                          Calculated Area
                        </span>
                        <span className='font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded'>
                          {mapValue.calculatedArea.toFixed(2)}{' '}
                          {field.areaUnit || 'm²'}
                        </span>
                      </div>
                    )}

                    {mapValue.calculatedLength !== undefined && (
                      <div className='flex items-center justify-between p-3 text-xs border-t border-border/10'>
                        <span className='text-muted-foreground font-medium'>
                          Calculated Length
                        </span>
                        <span className='font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded'>
                          {mapValue.calculatedLength.toFixed(2)}{' '}
                          {field.lengthUnit || 'm'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className='mt-auto p-3 bg-blue-50/50 border border-blue-100/50 rounded-md'>
                    <p className='text-[10px] text-blue-700 leading-relaxed font-medium'>
                      Location data is captured at the time of submission.
                      Multiple vertices represent polygon/line paths.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className='flex items-center gap-2 text-muted-foreground/50 italic text-sm'>
            <MapPin className='w-4 h-4' />
            No location data
          </div>
        )}
      </div>
    </DisplayFieldWrapper>
  );
}
