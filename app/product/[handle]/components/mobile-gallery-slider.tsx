'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { Product } from '@/lib/shopify/types';
import { Badge } from '@/components/ui/badge';
import { useProductImages, useSelectedVariant } from '@/components/products/variant-selector';

interface MobileGallerySliderProps {
  product: Product;
}

export function MobileGallerySlider({ product }: MobileGallerySliderProps) {
  const selectedVariant = useSelectedVariant(product);
  const images = useProductImages(product, selectedVariant?.selectedOptions);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: false,
    loop: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onInit = useCallback(() => {
    // Initialize carousel
  }, []);

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onInit();
    onSelect(emblaApi);
    emblaApi.on('reInit', onInit);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onInit, onSelect]);

  const totalImages = images.length;

  if (totalImages === 0) return null;

  return (
    <div className="relative w-full h-full">
      {/* Embla Carousel */}
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${image.selectedOptions?.map(o => `${o.name},${o.value}`).join('-')}`}
              className="flex-shrink-0 w-full h-full relative"
            >
              <Image
                style={{
                  aspectRatio: `${image.width} / ${image.height}`,
                }}
                src={image.url}
                alt={image.altText}
                width={image.width}
                height={image.height}
                className="w-full h-full object-cover"
                quality={100}
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Counter Badge - styled like Latest drop badge */}
      {totalImages > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <Badge variant="outline-secondary">
            {selectedIndex + 1}/{totalImages}
          </Badge>
        </div>
      )}
    </div>
  );
}
