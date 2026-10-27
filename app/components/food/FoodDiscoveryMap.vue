<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { RankedPlace } from '~/composables/useFoodDiscovery';

const props = defineProps<{
  places: RankedPlace[];
  selectedPlace: RankedPlace | null;
  centerLat?: number;
  centerLng?: number;
}>();

const emit = defineEmits<{
  (e: 'selectPlace', place: RankedPlace): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let mapInstance: any = null;
let markers: any[] = [];

function initMap() {
  if (typeof window === 'undefined' || !(window as any).L || !mapContainer.value) {
    return;
  }

  const L = (window as any).L;

  const defaultLat = props.centerLat || 11.5564;
  const defaultLng = props.centerLng || 104.9282;

  // Cleanup existing map if any
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    markers = [];
  }

  mapInstance = L.map(mapContainer.value, {
    center: [defaultLat, defaultLng],
    zoom: 14,
    zoomControl: true,
    attributionControl: true,
  });

  // Standard policy-compliant OpenStreetMap tile layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(mapInstance);

  renderMarkers();
}

function renderMarkers() {
  if (!mapInstance || typeof window === 'undefined' || !(window as any).L) return;

  const L = (window as any).L;

  // Clear existing markers
  markers.forEach((m) => m.remove());
  markers = [];

  if (!props.places || props.places.length === 0) return;

  const bounds = L.latLngBounds([]);

  props.places.forEach((place, index) => {
    const isSelected = props.selectedPlace?.id === place.id;

    // Custom colored pin indicator
    const pinColor = isSelected ? '#2563eb' : '#dc2626';
    const pinHtml = `
      <div style="background-color: ${pinColor}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid #ffffff;">
        <span style="transform: rotate(45deg); color: #ffffff; font-weight: bold; font-size: 11px;">${index + 1}</span>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'custom-food-marker',
      html: pinHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });

    const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(mapInstance);

    const priceText = place.isPriceVerified && place.estimatedPricePerPersonUsd
      ? `ប្រហែល $${place.estimatedPricePerPersonUsd}/នាក់`
      : 'តម្លៃមិនទាន់ផ្ទៀងផ្ទាត់ (Price not verified)';

    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

    const popupContent = `
      <div style="font-family: 'Hanuman', sans-serif; font-size: 13px; line-height: 1.5; min-width: 180px;">
        <h4 style="font-weight: 700; margin: 0 0 4px; color: #0f172a; font-size: 14px;">${place.name}</h4>
        <p style="margin: 0 0 4px; color: #64748b; font-size: 12px;">${place.street || place.city}</p>
        <p style="margin: 0 0 6px; font-weight: 600; color: #2563eb; font-size: 12px;">${priceText}</p>
        <div style="margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
            🧭 មើលទិសដៅ &rarr;
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);

    marker.on('click', () => {
      emit('selectPlace', place);
    });

    markers.push(marker);
    bounds.extend([place.lat, place.lng]);

    if (isSelected) {
      marker.openPopup();
    }
  });

  if (props.places.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }
}

watch(
  () => props.places,
  () => {
    renderMarkers();
  },
  { deep: true },
);

watch(
  () => props.selectedPlace,
  (newPlace) => {
    if (!newPlace || !mapInstance) return;
    mapInstance.panTo([newPlace.lat, newPlace.lng], { animate: true, duration: 0.5 });
    const matchIndex = props.places.findIndex((p) => p.id === newPlace.id);
    if (matchIndex >= 0 && markers[matchIndex]) {
      markers[matchIndex].openPopup();
    }
  },
);

onMounted(() => {
  // Check if Leaflet script is already loaded; if not, poll briefly
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if ((window as any).L || attempts > 20) {
      clearInterval(timer);
      if ((window as any).L) {
        initMap();
      }
    }
  }, 200);
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div ref="mapContainer" class="h-72 w-full sm:h-96" />
    <div class="absolute bottom-2 left-2 z-[400] rounded-md bg-white/90 px-2 py-1 text-[10px] text-slate-700 shadow backdrop-blur dark:bg-slate-900/90 dark:text-slate-300">
      ទិន្នន័យ &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" class="underline hover:text-blue-600">OpenStreetMap</a>
    </div>
  </div>
</template>

<style>
/* Leaflet styles override for clean integration */
.custom-food-marker {
  background: transparent;
  border: none;
}
.leaflet-popup-content-wrapper {
  border-radius: 12px !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15) !important;
}
</style>
