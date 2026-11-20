/** @jsx jsx */
import { React, jsx, loadArcGISJSAPIModules, type AllWidgetProps, WidgetState } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import { Button, Message } from 'jimu-ui'
import Graphic from 'esri/Graphic'
import SpatialReference from 'esri/geometry/SpatialReference'
import * as webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import type { IMConfig } from '../config'
import defaultMessages from './translations/default'
import { getStyle } from './style'

interface State {
  hasPoint: boolean
  errorMessage?: string
  captureEnabled: boolean
  locationSaved: boolean
}

interface ProjectionModule {
  load: () => Promise<void>
  project: (geometry: __esri.Geometry, spatialReference: __esri.SpatialReference) => __esri.Geometry | null
}

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State> {
  state: State = {
    hasPoint: false,
    captureEnabled: true,
    locationSaved: false
  }

  private jimuMapView: JimuMapView | null = null
  private clickHandle: { remove: () => void } | null = null
  private markerGraphic: Graphic | null = null
  private pendingStreetViewWindow: Window | null = null
  private coordinateRequestCounter = 0

  nls = (id: keyof typeof defaultMessages): string => {
      return this.props.intl.formatMessage({
          id,
          defaultMessage: defaultMessages[id]
      })
  }

  componentWillUnmount (): void {
    this.coordinateRequestCounter++
    this.closePendingStreetViewWindow()
    this.removeClickHandler()
    this.clearMarker()
    this.jimuMapView = null
  }

  private readonly removeClickHandler = (): void => {
    if (this.clickHandle) {
      this.clickHandle.remove()
      this.clickHandle = null
    }
  }

  private readonly closePendingStreetViewWindow = (): void => {
    if (this.pendingStreetViewWindow) {
      this.pendingStreetViewWindow.close()
      this.pendingStreetViewWindow = null
    }
  }

  private readonly onActiveViewChange = (jimuMapView: JimuMapView): void => {
    if (!jimuMapView?.view) return

    if (this.jimuMapView?.view === jimuMapView.view) {
      this.addClickHandler()
      return
    }

    this.removeClickHandler()
    this.clearCurrentPoint()

    this.jimuMapView = jimuMapView
    this.addClickHandler()
  }

  private readonly onMapClick = async (event: __esri.ViewClickEvent): Promise<void> => {
    const view = this.jimuMapView?.view
    if (!view || !event.mapPoint || !this.state.captureEnabled || !this.isWidgetOpened()) return

    this.setState({ locationSaved: false })
    const clickedPoint = event.mapPoint.clone()
    const coordinateRequest = ++this.coordinateRequestCounter
    this.closePendingStreetViewWindow()

    const streetViewWindow = window.open('about:blank', '_blank')
    if (!streetViewWindow) {
      this.setState({ errorMessage: this.nls('newTabBlocked') })
      return
    }

    streetViewWindow.opener = null
    this.pendingStreetViewWindow = streetViewWindow

    let wgs84Point: __esri.Point

    try {
      wgs84Point = await this.toWgs84(clickedPoint)
    } catch (error) {
      streetViewWindow.close()
      if (this.pendingStreetViewWindow === streetViewWindow) {
        this.pendingStreetViewWindow = null
      }
      console.error('Unable to convert the map point to WGS84 for Street View.', error)
      if (coordinateRequest === this.coordinateRequestCounter && this.jimuMapView?.view === view) {
        this.setState({ errorMessage: this.nls('coordinateConversionFailed') })
      }
      return
    }

    if (coordinateRequest !== this.coordinateRequestCounter || this.jimuMapView?.view !== view) {
      streetViewWindow.close()
      if (this.pendingStreetViewWindow === streetViewWindow) {
        this.pendingStreetViewWindow = null
      }
      return
    }

    this.setMarker(clickedPoint)

    if (this.props.config.centerMapOnClick ?? true) {
      view.goTo(
        { center: clickedPoint },
        { animate: false }
      ).catch(() => undefined)
    }

    const lat = Number(wgs84Point.latitude.toFixed(6))
    const lon = Number(wgs84Point.longitude.toFixed(6))
    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(`${lat},${lon}`)}`

    this.setState({
      hasPoint: true,
      errorMessage: undefined
    })

    try {
      streetViewWindow.location.replace(streetViewUrl)
      if (this.pendingStreetViewWindow === streetViewWindow) {
        this.pendingStreetViewWindow = null
      }
      this.setState({ locationSaved: true })
    } catch (error) {
      streetViewWindow.close()
      if (this.pendingStreetViewWindow === streetViewWindow) {
        this.pendingStreetViewWindow = null
      }
      console.error('Unable to open Google Street View in a new tab.', error)
      this.setState({ errorMessage: this.nls('newTabBlocked') })
    }
  }

  private async toWgs84 (point: __esri.Point): Promise<__esri.Point> {
    if (!point?.spatialReference) {
      throw new Error('The map point has no spatial reference.')
    }

    if (point.spatialReference.isWGS84) {
      return point
    }

    if (point.spatialReference.isWebMercator) {
      return webMercatorUtils.webMercatorToGeographic(point) as __esri.Point
    }

    const [loadedModule] = await loadArcGISJSAPIModules(['esri/geometry/projection'])
    const projection = loadedModule as ProjectionModule
    await projection.load()
    const projectedPoint = projection.project(point, new SpatialReference({ wkid: 4326 }))

    if (!projectedPoint || projectedPoint.type !== 'point') {
      throw new Error(`Projection from spatial reference ${point.spatialReference.wkid} to WGS84 failed.`)
    }

    return projectedPoint as __esri.Point
  }

  private readonly setMarker = (point: __esri.Point): void => {
    const view = this.jimuMapView?.view
    if (!view) return

    // Rimuove sempre il vecchio graphic e ne crea uno nuovo:
    // mutare .geometry direttamente non garantisce il redraw in EXB.
    if (this.markerGraphic) {
      view.graphics.remove(this.markerGraphic)
      this.markerGraphic = null
    }

    this.markerGraphic = new Graphic({
      geometry: point.clone(),
      symbol: {
        type: 'simple-marker',
        style: 'circle',
        color: [220, 53, 69, 0.95],
        size: 12,
        outline: {
          color: [255, 255, 255, 1],
          width: 2
        }
      } as any
    })

    view.graphics.add(this.markerGraphic)

    // Micro-goTo al centro corrente: forza il renderer a ridisegnare
    // senza spostare la mappa visivamente.
      if (!(this.props.config.centerMapOnClick ?? true)) {
      const center = view.center?.clone()
      if (center) {
          view.goTo({ center }, { animate: false }).catch(() => undefined)
      }
    }
  }


  private readonly clearMarker = (): void => {
    const view = this.jimuMapView?.view

    if (view && this.markerGraphic) {
      view.graphics.remove(this.markerGraphic)
    }

    this.markerGraphic = null
  }

  private readonly refreshViewAfterClear = (): void => {
    const view = this.jimuMapView?.view
    if (!view) return

    const center = view.center?.clone()
    if (!center) return

    const dx = view.resolution ? view.resolution * 0.25 : 0.01

    const shiftedCenter = center.clone()
    shiftedCenter.x += dx

    view.goTo(
      { center: shiftedCenter },
      { animate: false }
    ).then(() => {
      view.goTo({ center }, { animate: false }).catch(() => undefined)
    }).catch(() => undefined)
  }

  private readonly clearCurrentPoint = (): void => {
    this.coordinateRequestCounter++
    this.closePendingStreetViewWindow()
    this.clearMarker()

    this.setState({
      hasPoint: false,
      errorMessage: undefined,
      locationSaved: false
    }, () => {
      this.refreshViewAfterClear()
    })
  }

  private readonly toggleCapture = (): void => {
    this.setState((prevState) => ({
      captureEnabled: !prevState.captureEnabled
    }))
  }

  private readonly getWidgetTitle = (): string => {
    const configuredTitle = this.props.config.widgetTitle?.trim()
    return configuredTitle || this.nls('title')
  }

  private readonly isWidgetOpened = (): boolean => {
    return this.props.state == null || this.props.state === WidgetState.Opened
  }

  private readonly addClickHandler = (): void => {
    const view = this.jimuMapView?.view

    if (!view || this.clickHandle || !this.isWidgetOpened()) return

    this.clickHandle = view.on('click', this.onMapClick)
  }

  componentDidUpdate (prevProps: AllWidgetProps<IMConfig>): void {
    if (prevProps.state !== this.props.state) {
      if (this.isWidgetOpened()) {
        this.addClickHandler()
      } else {
        this.removeClickHandler()
        this.coordinateRequestCounter++
        this.closePendingStreetViewWindow()
      }
    }
  }

  render () {
    const hasMap = this.props.useMapWidgetIds?.length > 0
    const hint = !hasMap
      ? this.nls('selectMap')
      : this.state.errorMessage || (this.state.captureEnabled
        ? this.nls('clickMap')
        : this.nls('clickDisabled'))

    const { hasPoint } = this.state

    return (
      <div className="widget-street-view jimu-widget" css={getStyle()}>
        <div className="widget-street-view__panel">
          <div className="widget-street-view__header">
            <div className="widget-street-view__title">{this.getWidgetTitle()}</div>
            <div className="widget-street-view__hint" role={this.state.errorMessage ? 'alert' : undefined}>{hint}</div>
            <div className="widget-street-view__toolbar">
              <Button
                size="sm"
                type={this.state.captureEnabled ? 'primary' : 'default'}
                onClick={this.toggleCapture}
              >
                {this.state.captureEnabled ? this.nls('deactivateClick') : this.nls('activateClick')}
              </Button>
              <Button
                size="sm"
                onClick={this.clearCurrentPoint}
                disabled={!hasPoint}
              >
                {this.nls('clearPoint')}
              </Button>
            </div>
          </div>
        </div>

        <Message
          open={this.state.locationSaved}
          role="status"
          severity="success"
          message={this.nls('locationSaved')}
          autoHideDuration={3000}
          onClose={() => { this.setState({ locationSaved: false }) }}
        />

        {hasMap && (
          <div className="widget-street-view__map-connection">
            <JimuMapViewComponent
              useMapWidgetId={this.props.useMapWidgetIds[0]}
              onActiveViewChange={this.onActiveViewChange}
            />
          </div>
        )}
      </div>
    )
  }
}
