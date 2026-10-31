import { useEffect, useMemo, useState } from 'react';
import Globe from 'react-globe.gl';
import type { Shipment } from '../types/shipment';

interface ShipmentGlobeProps {
  shipment: Shipment;
  progressPercentage?: number;
}

interface GlobePoint {
  lat: number;
  lng: number;
  name: string;
  color: string;
  size: number;
}

interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
}

export default function ShipmentGlobe({
  shipment,
  progressPercentage = 0,
}: ShipmentGlobeProps) {
  const [dimensions, setDimensions] = useState({
    width: 640,
    height: 420,
  });

  const isOnHold = String(shipment.movementStatus)
    .toLowerCase()
    .includes('hold');

  const isDelivered =
    String(shipment.movementStatus).toLowerCase() === 'delivered' ||
    Boolean(shipment.actualDelivery);

  const progress = Math.max(
    0,
    Math.min(100, isDelivered ? 100 : progressPercentage),
  );

  const origin = shipment.originHub;
  const destination = shipment.destinationHub;
  const current = shipment.currentLocation;

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: Math.max(300, Math.min(window.innerWidth - 48, 1000)),
        height: window.innerWidth < 640 ? 320 : 420,
      });
    };

    updateDimensions();

    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const points = useMemo<GlobePoint[]>(() => {
    const validCoordinate = (lat: number, lng: number) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    const result: GlobePoint[] = [];

    if (validCoordinate(origin.lat, origin.lng)) {
      result.push({
        lat: origin.lat,
        lng: origin.lng,
        name: `Origin: ${origin.city}, ${origin.country}`,
        color: '#22d3ee',
        size: 0.8,
      });
    }

    if (validCoordinate(destination.lat, destination.lng)) {
      result.push({
        lat: destination.lat,
        lng: destination.lng,
        name: `Destination: ${destination.city}, ${destination.country}`,
        color: '#34d399',
        size: 0.8,
      });
    }

    if (validCoordinate(current.lat, current.lng)) {
      result.push({
        lat: current.lat,
        lng: current.lng,
        name: `Recorded location: ${current.city}, ${current.country}`,
        color: '#fbbf24',
        size: 0.65,
      });
    }

    return result;
  }, [origin, destination, current]);

  const arcs = useMemo<GlobeArc[]>(() => {
    const validCoordinates = (lat: number, lng: number) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    if (
      !validCoordinates(origin.lat, origin.lng) ||
      !validCoordinates(destination.lat, destination.lng)
    ) {
      return [];
    }

    return [
      {
        startLat: origin.lat,
        startLng: origin.lng,
        endLat: destination.lat,
        endLng: destination.lng,
        color: ['#22d3ee', '#34d399'],
      },
    ];
  }, [origin, destination]);

  const marker = useMemo(() => {
    const validCoordinates = (lat: number, lng: number) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    if (
      !validCoordinates(origin.lat, origin.lng) ||
      !validCoordinates(destination.lat, destination.lng)
    ) {
      return [];
    }

    /*
     * Use the recorded current location when available.
     * Otherwise, estimate a position along the route using progress.
     */
    if (validCoordinates(current.lat, current.lng)) {
      return [
        {
          lat: current.lat,
          lng: current.lng,
          name: `${progress}% journey progress`,
          color: isOnHold ? '#f59e0b' : '#f8fafc',
          size: 1.1,
        },
      ];
    }

    const fraction = progress / 100;

    return [
      {
        lat: origin.lat + (destination.lat - origin.lat) * fraction,
        lng: origin.lng + (destination.lng - origin.lng) * fraction,
        name: `${progress}% journey progress`,
        color: isOnHold ? '#f59e0b' : '#f8fafc',
        size: 1.1,
      },
    ];
  }, [origin, destination, current, progress, isOnHold]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
        <div>
          <h3 className="font-semibold text-white">
            Global Shipment Tracking
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            {origin.city}, {origin.country} → {destination.city},{' '}
            {destination.country}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isDelivered
              ? 'bg-emerald-500/15 text-emerald-400'
              : isOnHold
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-cyan-500/15 text-cyan-400'
          }`}
        >
          {isDelivered
            ? 'Journey completed'
            : isOnHold
              ? 'Shipment on hold'
              : `${progress}% journey progress`}
        </span>
      </div>

      <div className="flex justify-center overflow-hidden">
        <Globe
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#020617"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          showAtmosphere
          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.18}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.015}
          pointRadius="size"
          pointLabel="name"
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcAltitudeAutoScale={0.35}
          arcStroke={0.6}
          arcDashLength={0.45}
          arcDashGap={0.25}
          arcDashAnimateTime={isOnHold || isDelivered ? 0 : 1800}
          ringsData={marker}
          ringLat="lat"
          ringLng="lng"
          ringColor="color"
          ringMaxRadius={3}
          ringPropagationSpeed={isOnHold || isDelivered ? 0 : 1.5}
          ringRepeatPeriod={isOnHold || isDelivered ? 0 : 1000}
          animateIn
        />
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-slate-800 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Origin</p>
          <p className="mt-1 text-sm text-cyan-300">
            {origin.code} · {origin.city}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Recorded location</p>
          <p className="mt-1 text-sm text-amber-300">
            {current.city}, {current.country}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Destination</p>
          <p className="mt-1 text-sm text-emerald-300">
            {destination.code} · {destination.city}
          </p>
        </div>
      </div>

      <p className="px-4 pb-4 text-xs text-slate-500">
        The route shows the recorded shipment journey. The globe does not
        independently verify the physical location of the shipment.
      </p>
    </section>
  );
}