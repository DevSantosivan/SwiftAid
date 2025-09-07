declare module 'file-saver';

declare module 'leaflet-routing-machine' {
  import * as L from 'leaflet';

  namespace Routing {
    interface RoutingControlOptions extends L.ControlOptions {
      waypoints?: L.LatLngExpression[];
      routeWhileDragging?: boolean;
      draggableWaypoints?: boolean;
      addWaypoints?: boolean;
      createMarker?: () => L.Marker | null;
      show?: boolean;
    }

    interface RoutingControl extends L.Control {
      setWaypoints(waypoints: L.LatLngExpression[]): void;
      remove(): void;
    }

    function control(options?: RoutingControlOptions): RoutingControl;
  }

  const Routing: typeof Routing;
  export = Routing;
}
